import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";


export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,   // refresh token once per day
  },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const email = credentials.email.trim().toLowerCase();
          const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://localhost:3002";
          console.log(`Tentando login para ${email} em ${backendUrl}/api/auth/login`);
          
          const res = await fetch(`${backendUrl}/api/auth/login`, {
            method: "POST",
            body: JSON.stringify({ email, password: credentials.password }),
            headers: { "Content-Type": "application/json" }
          });

          if (!res.ok) {
            console.error(`Falha no login: Status ${res.status}`);
            return null;
          }

          const user = await res.json();
          console.log(`Usuário logado com sucesso: ${user.email}`);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (err) {
          console.error("Auth authorize error:", err);
          return null;
        }
      },


    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string; id?: string }).role = token.role as string;
        (session.user as { role?: string; id?: string }).id = token.id as string;
      }
      return session;
    },
  },
};
