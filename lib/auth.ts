import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import connectDB from "@/lib/db";
import User from "@/models/User";

declare module "next-auth" {
  interface User {
    id?: string;
    state?: string;
    cd?: string;
    userName?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      state: string;
      cd: string;
      userName: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    state?: string;
    cd?: string;
    userName?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await connectDB();

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await User.findOne({
          email: credentials.email as string,
        });
        if (!user) {
          return null;
        }

        const isValid = await user.comparePassword(
          credentials.password as string
        );
        if (!isValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          userName: user.userName,
          state: user.state,
          cd: user.cd,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.state = user.state;
        token.cd = user.cd;
        token.userName = user.userName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.state = token.state as string;
        session.user.cd = token.cd as string;
        session.user.userName = token.userName as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
