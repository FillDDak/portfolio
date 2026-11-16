// 관리자 비밀번호 해시 생성.
// 사용: npm run hash-password
// 출력된 값을 .env 의 ADMIN_PASSWORD_HASH_B64 에 넣는다.
//
// bcrypt 해시에는 `$` 가 들어 있어서 .env 에 그대로 적으면 변수로 해석되어 값이 깨진다.
// 그래서 base64 로 한 번 감싼 값을 쓴다.
import { stdin, stdout } from "node:process";
import bcrypt from "bcryptjs";

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    stdout.write(prompt);
    if (!stdin.isTTY) {
      // 파이프로 넘겨받은 경우: 첫 줄을 비밀번호로 쓴다.
      let data = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (chunk) => (data += chunk));
      stdin.on("end", () => resolve(data.split(/\r?\n/)[0] ?? ""));
      return;
    }
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (char) => {
      if (char === "\r" || char === "\n" || char === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        stdout.write("\n");
        resolve(value);
      } else if (char === "\u0003") {
        stdin.setRawMode(false);
        reject(new Error("취소했습니다."));
      } else if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    stdin.on("data", onData);
  });
}

try {
  const password = await readHidden("새 관리자 비밀번호 (입력 내용은 보이지 않습니다): ");
  if (password.length < 10) {
    console.error("비밀번호는 10자 이상으로 정해 주세요.");
    process.exit(1);
  }
  if (stdin.isTTY) {
    const again = await readHidden("한 번 더 입력: ");
    if (again !== password) {
      console.error("두 입력이 서로 다릅니다.");
      process.exit(1);
    }
  }
  const hash = await bcrypt.hash(password, 12);
  const encoded = Buffer.from(hash, "utf8").toString("base64");
  console.log("\n아래 줄을 .env 에 넣으세요:\n");
  console.log(`ADMIN_PASSWORD_HASH_B64="${encoded}"`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
