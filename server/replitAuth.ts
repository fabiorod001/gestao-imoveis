import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  try {
    const config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      try {
        const user = {};
        updateUserSession(user, tokens);
        await upsertUser(tokens.claims());
        verified(null, user);
      } catch (error) {
        console.error("Auth verification error:", error);
        verified(error, null);
      }
    };

    const domains = process.env.REPLIT_DOMAINS!.split(",");
    
    for (const domain of domains) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }

    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));

    app.get("/api/login", (req, res, next) => {
      try {
        const hostname = req.hostname || req.get('host')?.split(':')[0] || domains[0];
        const strategyName = `replitauth:${hostname}`;
        
        console.log(`Attempting authentication with strategy: ${strategyName}`);
        
        passport.authenticate(strategyName, {
          prompt: "login consent",
          scope: ["openid", "email", "profile", "offline_access"],
        })(req, res, next);
      } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Authentication failed" });
      }
    });

    app.get("/api/callback", (req, res, next) => {
      try {
        const hostname = req.hostname || req.get('host')?.split(':')[0] || domains[0];
        const strategyName = `replitauth:${hostname}`;
        
        console.log(`Callback with strategy: ${strategyName}`);
        
        passport.authenticate(strategyName, {
          successReturnToOrRedirect: "/",
          failureRedirect: "/api/login",
          failureMessage: true
        })(req, res, next);
      } catch (error) {
        console.error("Callback error:", error);
        res.redirect("/api/login");
      }
    });

    app.get("/api/logout", (req, res) => {
      req.logout(() => {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    });
  } catch (error) {
    console.error("Auth setup error:", error);
    
    // Fallback: criar rota simples para desenvolvimento
    app.get("/api/login", (req, res) => {
      res.status(500).json({ error: "Authentication service unavailable" });
    });
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Em desenvolvimento, sempre criar um usuário padrão
  if (process.env.NODE_ENV === 'development') {
    try {
      const defaultUser = {
        id: "dev-user",
        email: "dev@example.com",
        name: "Usuário de Desenvolvimento",
        imageUrl: null,
        profileImageUrl: null,
      };
      
      // Tentar obter ou criar usuário padrão
      const storage = await import('./storage.js');
      let user = await storage.storage.getUser(defaultUser.id);
      
      if (!user) {
        user = await storage.storage.upsertUser(defaultUser);
      }
      
      req.user = { 
        userId: user.id, 
        sub: user.id,
        email: user.email,
        name: user.name,
        expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hora
      };
      return next();
    } catch (error) {
      console.error("Development auth error:", error);
      // More specific error handling
      if (error instanceof Error && error.message.includes('Connection terminated')) {
        // Wait a moment and retry
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
          const storage = await import('./storage.js');
          let user = await storage.storage.getUser(defaultUser.id);
          
          if (!user) {
            user = await storage.storage.upsertUser(defaultUser);
          }
          
          req.user = { 
            userId: user.id, 
            sub: user.id,
            email: user.email,
            name: user.name,
            expires_at: Math.floor(Date.now() / 1000) + 3600
          };
          return next();
        } catch (retryError) {
          console.error("Retry failed:", retryError);
          return res.status(503).json({ message: "Database connection error. Please try again." });
        }
      }
      return res.status(500).json({ message: "Authentication error" });
    }
  }

  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
