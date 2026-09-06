import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { authorizeEntraIdentity, parseAndValidateEntraClaims, type AppSessionUser } from "@/services/auth/entra-identity";

type EntraProfile = Record<string,unknown> & { appUser?:AppSessionUser };
const tenantId = process.env.MICROSOFT_TENANT_ID?.trim();

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers:[MicrosoftEntraID({
    clientId:process.env.MICROSOFT_CLIENT_ID,
    clientSecret:process.env.MICROSOFT_CLIENT_SECRET,
    issuer:tenantId ? `https://login.microsoftonline.com/${tenantId}/v2.0` : undefined,
    authorization:{params:{scope:"openid profile email",prompt:"select_account"}},
  })],
  pages:{signIn:"/login",error:"/login"},
  session:{strategy:"jwt",maxAge:60*60},
  callbacks:{
    async signIn({account,profile}) {
      if (account?.provider !== "microsoft-entra-id" || !profile) return false;
      const claims = parseAndValidateEntraClaims(profile as Record<string,unknown>);
      if (!claims) return false;
      try {
        const appUser = await authorizeEntraIdentity(claims);
        if (!appUser) return false;
        (profile as EntraProfile).appUser = appUser;
        return true;
      } catch { return false; }
    },
    async jwt({token,profile}) {
      const appUser = (profile as EntraProfile|undefined)?.appUser;
      if (appUser) {
        token.appId=appUser.id;token.role=appUser.role;token.initials=appUser.initials;token.permissions=appUser.permissions;
        token.assignedProjectIds=appUser.assignedProjectIds;token.editableProjectIds=appUser.editableProjectIds;token.entraObjectId=appUser.entraObjectId;
      }
      return token;
    },
    async session({session,token}) {
      if (session.user) {
        session.user.appId=String(token.appId??"");session.user.role=token.role as AppSessionUser["role"];session.user.initials=String(token.initials??"");
        session.user.permissions=token.permissions as AppSessionUser["permissions"];session.user.assignedProjectIds=(token.assignedProjectIds as string[]|undefined)??[];
        session.user.editableProjectIds=(token.editableProjectIds as string[]|undefined)??[];session.user.entraObjectId=String(token.entraObjectId??"");
      }
      return session;
    },
    authorized({auth,request}) {
      const path=request.nextUrl.pathname;
      if (path === "/login" || path.startsWith("/api/auth")) return true;
      return Boolean(auth?.user?.appId && auth.user.entraObjectId);
    },
  },
});
