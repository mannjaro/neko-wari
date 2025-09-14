import { z } from "zod";

// ログインフォームのスキーマ
export const LoginFormSchema = z.object({
  email: z.email({
    message: "Username must be at least 2 characters.",
  }),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください")
    .regex(
      /^(?=.*?[a-z])(?=.*?\d)[a-z\d]{8,100}$/i,
      "パスワードは半角英数字混合で入力してください",
    ),
});

export type LoginFormData = z.infer<typeof LoginFormSchema>;

// 認証関連のフォームスキーマも今後ここに追加
export const SignUpFormSchema = z
  .object({
    email: z.email({
      message: "有効なメールアドレスを入力してください",
    }),
    password: z
      .string()
      .min(8, "パスワードは8文字以上で入力してください")
      .regex(
        /^(?=.*?[a-z])(?=.*?\d)[a-z\d]{8,100}$/i,
        "パスワードは半角英数字混合で入力してください",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

export type SignUpFormData = z.infer<typeof SignUpFormSchema>;
