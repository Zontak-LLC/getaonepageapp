import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { Redis } from "@upstash/redis";
import { findUser } from "@/lib/user-store";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = ((credentials?.email as string) ?? "").toLowerCase().trim();
        const password = (credentials?.password as string) ?? "";

        if (!email || !password) return null;

        const kv = Redis.fromEnv();
        const user = await findUser(email, kv);
        if (!user) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: email,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    jwt({ token, user }) {
      // `user` is only populated on the initial sign-in (authorize return value)
      if (user) {
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    session({ session, token }) {
      if (token.email) {
        session.user.email = token.email as string;
      }
      if (token.name) {
        session.user.name = token.name as string;
      }
      // Use email as user ID — downstream code keys on session.user.email
      session.user.id = (token.email as string) ?? "";
      return session;
    },
  },
});
