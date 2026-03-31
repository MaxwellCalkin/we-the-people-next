import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import connectDB from "@/lib/db";
import User from "@/models/User";

declare module "next-auth" {
  interface User {
    id?: string;
    state?: string;
    cd?: string;
    userName?: string;
    needsOnboarding?: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      state: string;
      cd: string;
      userName: string;
      needsOnboarding: boolean;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    state?: string;
    cd?: string;
    userName?: string;
    needsOnboarding?: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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

        const needsOnboarding = !user.state || !user.cd;

        return {
          id: user._id.toString(),
          email: user.email,
          userName: user.userName,
          state: user.state,
          cd: user.cd,
          needsOnboarding,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectDB();
        const existingUser = await User.findOne({ email: user.email });
        if (!existingUser) {
          await User.create({
            email: user.email!,
            userName: user.name ?? user.email!,
            provider: "google",
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google") {
          await connectDB();
          const dbUser = await User.findOne({ email: user.email });
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.state = dbUser.state;
            token.cd = dbUser.cd;
            token.userName = dbUser.userName;
            token.needsOnboarding = !dbUser.state || !dbUser.cd;
          }
        } else {
          token.id = user.id;
          token.state = user.state;
          token.cd = user.cd;
          token.userName = user.userName;
          token.needsOnboarding = user.needsOnboarding;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.state = token.state as string;
        session.user.cd = token.cd as string;
        session.user.userName = token.userName as string;
        session.user.needsOnboarding = !!token.needsOnboarding;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
