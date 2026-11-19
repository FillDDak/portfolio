"use client";

import { useActionState, useEffect, useState } from "react";
import { loginAction, type LoginState } from "@/actions/auth";
import { buttonClass } from "@/components/ui/button";
import { fieldClass, labelClass } from "@/components/ui/field";
import { collectClientInfo } from "@/lib/device/collect";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [client, setClient] = useState("");

  useEffect(() => {
    void collectClientInfo(true).then((info) => setClient(JSON.stringify(info)));
  }, []);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="client" value={client} />
      <div>
        <label htmlFor="username" className={labelClass}>
          아이디
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={fieldClass}
        />
      </div>

      <p
        role="alert"
        className={
          state.error
            ? "rounded-lg bg-danger-soft px-3.5 py-2.5 text-[0.9375rem] font-medium text-danger"
            : "sr-only"
        }
      >
        {state.error ?? ""}
      </p>

      <button type="submit" disabled={pending} className={buttonClass("primary", "w-full")}>
        {pending ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
