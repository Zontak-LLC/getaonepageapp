import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { findUser } from "@/lib/user-store";

declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: string;
  }
}

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

        const user = await findUser(email);
        if (!user) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: email,
          email: user.email,
          name: user.name,
          role: user.role,
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
        token.role = user.role ?? "user";
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
      session.user.role = (token.role as string) ?? "user";
      return session;
    },
  },
});
