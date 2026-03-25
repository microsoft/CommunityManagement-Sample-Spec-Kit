import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { upsertSocialUser, getUserIdByOid } from "./social-user";
import type { SocialUserProfile } from "@acroyoga/shared/types/auth";

export const { handlers, auth } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.ENTRA_CLIENT_ID!,
      // R-1: CIAM issuer URL for Entra External ID (replaces workforce login.microsoftonline.com)
      issuer: `https://${process.env.ENTRA_TENANT_DOMAIN!}.ciamlogin.com/${process.env.ENTRA_TENANT_ID!}/v2.0`,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      // R-3: Use oid claim from Entra token as stable user identity
      const oid = profile?.sub ?? (profile as Record<string, unknown>)?.oid as string | undefined;
      if (!oid) {
        // No oid claim — refuse sign-in
        return false;
      }

      // R-4: User provisioning on sign-in via upsertSocialUser
      const socialProfile: SocialUserProfile = {
        providerOid: oid,
        provider: "microsoft-entra-id",
        email: profile?.email ?? null,
        displayName: profile?.name ?? null,
        avatarUrl: (profile as Record<string, unknown>)?.picture as string ?? null,
      };

      await upsertSocialUser(socialProfile);
      return true;
    },

    async jwt({ token, profile }) {
      if (profile) {
        // R-3: Map oid → platform UUID on sign-in
        const oid = profile?.sub ?? (profile as Record<string, unknown>)?.oid as string | undefined;
        if (oid) {
          const userId = await getUserIdByOid(oid);
          if (userId) {
            token.userId = userId;
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      // Session shape unchanged (Spec 004 compatibility)
      if (token.userId) {
        session.user.id = token.userId as string;
      } else if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
});
