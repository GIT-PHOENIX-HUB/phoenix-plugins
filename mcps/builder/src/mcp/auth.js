/**
 * MCP Authentication Handler
 * 
 * Handles OAuth 2.1 + PKCE authentication for protected MCP tools.
 * Supports multiple identity providers (Auth0, Stytch, Entra ID).
 */

const crypto = require('crypto');

class MCPAuthHandler {
    constructor(config = {}) {
        this.config = {
            idpType: config.idpType || process.env.MCP_IDP_TYPE || 'auth0', // auth0, stytch, entra
            issuer: config.issuer || process.env.MCP_OAUTH_ISSUER,
            clientId: config.clientId || process.env.MCP_OAUTH_CLIENT_ID,
            clientSecret: config.clientSecret || process.env.MCP_OAUTH_CLIENT_SECRET,
            audience: config.audience || process.env.MCP_OAUTH_AUDIENCE || 'phoenix-mcp',
            redirectUri: config.redirectUri || process.env.MCP_OAUTH_REDIRECT_URI,
            scopes: config.scopes || [
                'st.read',
                'st.write',
                'graph.mail.read',
                'graph.mail.draft',
                'graph.teams.post',
                'courier.run',
                'courier.read',
                'builder.users.write',
                'builder.audit.read',
                'finance.read'
            ],
            ...config
        };

        // Token cache
        this.tokenCache = new Map();
    }

    /**
     * Express middleware to require specific scopes
     * @param {string|Array} requiredScopes - Required scope(s)
     */
    requireScope(requiredScopes) {
        const scopes = Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes];
        
        return async (req, res, next) => {
            try {
                const authResult = await this.validateRequest(req, scopes);
                
                if (!authResult.valid) {
                    return res.status(401).json({
                        error: 'Unauthorized',
                        message: authResult.error || 'Invalid or missing token',
                        requiredScopes: scopes,
                        authorizationUrl: this.getAuthorizationUrl(scopes)
                    });
                }

                // Attach user info to request
                req.user = authResult.user;
                req.tokenScopes = authResult.scopes;
                
                next();
            } catch (error) {
                res.status(500).json({
                    error: 'Authentication error',
                    message: error.message
                });
            }
        };
    }

    /**
     * Validate an incoming request
     * @param {Object} req - Express request
     * @param {Array} requiredScopes - Required scopes
     * @returns {Object} Validation result
     */
    async validateRequest(req, requiredScopes = []) {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                valid: false,
                error: 'No bearer token provided'
            };
        }

        const token = authHeader.substring(7);
        
        try {
            const decoded = await this.verifyToken(token);
            
            // Check scopes
            const tokenScopes = decoded.scope?.split(' ') || decoded.scopes || [];
            const hasRequiredScopes = requiredScopes.every(scope => 
                tokenScopes.includes(scope)
            );

            if (!hasRequiredScopes) {
                return {
                    valid: false,
                    error: 'Insufficient scopes',
                    requiredScopes,
                    tokenScopes
                };
            }

            return {
                valid: true,
                user: {
                    id: decoded.sub,
                    email: decoded.email,
                    name: decoded.name
                },
                scopes: tokenScopes
            };
        } catch (error) {
            return {
                valid: false,
                error: `Token validation failed: ${error.message}`
            };
        }
    }

    /**
     * Verify a JWT token
     * @param {string} token - JWT token
     * @returns {Object} Decoded token
     */
    async verifyToken(token) {
        // In production, use proper JWT verification with JWKS
        // This is a simplified implementation
        const jwt = require('jsonwebtoken');
        const jwksClient = require('jwks-rsa');

        // Get JWKS URI based on IDP
        const jwksUri = this._getJwksUri();
        
        if (!jwksUri) {
            // Fallback for development - decode without verification
            console.warn('⚠️ Token verification disabled - development mode');
            const decoded = jwt.decode(token);
            if (!decoded) {
                throw new Error('Invalid token format');
            }
            return decoded;
        }

        const client = jwksClient({
            jwksUri,
            cache: true,
            cacheMaxAge: 86400000 // 24 hours
        });

        const getKey = (header, callback) => {
            client.getSigningKey(header.kid, (err, key) => {
                if (err) {
                    callback(err);
                } else {
                    const signingKey = key.publicKey || key.rsaPublicKey;
                    callback(null, signingKey);
                }
            });
        };

        return new Promise((resolve, reject) => {
            jwt.verify(token, getKey, {
                audience: this.config.audience,
                issuer: this.config.issuer,
                algorithms: ['RS256']
            }, (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded);
            });
        });
    }

    /**
     * Get JWKS URI based on IDP type
     */
    _getJwksUri() {
        if (!this.config.issuer) {
            return null;
        }

        switch (this.config.idpType) {
            case 'auth0':
                return `${this.config.issuer}/.well-known/jwks.json`;
            case 'stytch':
                return `${this.config.issuer}/.well-known/jwks.json`;
            case 'entra':
                return `${this.config.issuer}/discovery/v2.0/keys`;
            default:
                return `${this.config.issuer}/.well-known/jwks.json`;
        }
    }

    /**
     * Get authorization URL for OAuth flow
     * @param {Array} scopes - Requested scopes
     * @param {string} state - CSRF state parameter
     * @returns {string} Authorization URL
     */
    getAuthorizationUrl(scopes = [], state = null) {
        const scopeString = scopes.length > 0 
            ? scopes.join(' ')
            : this.config.scopes.join(' ');

        const stateParam = state || this._generateState();
        const codeChallenge = this._generateCodeChallenge();

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            scope: scopeString,
            state: stateParam,
            code_challenge: codeChallenge.challenge,
            code_challenge_method: 'S256'
        });

        // Store code verifier for token exchange
        this.tokenCache.set(`verifier_${stateParam}`, codeChallenge.verifier);

        const authEndpoint = this._getAuthEndpoint();
        return `${authEndpoint}?${params.toString()}`;
    }

    /**
     * Get authorization endpoint based on IDP
     */
    _getAuthEndpoint() {
        if (!this.config.issuer) {
            return 'https://auth.phoenix.local/authorize';
        }

        switch (this.config.idpType) {
            case 'auth0':
                return `${this.config.issuer}/authorize`;
            case 'stytch':
                return `${this.config.issuer}/oauth2/authorize`;
            case 'entra':
                return `${this.config.issuer}/oauth2/v2.0/authorize`;
            default:
                return `${this.config.issuer}/authorize`;
        }
    }

    /**
     * Exchange authorization code for tokens
     * @param {string} code - Authorization code
     * @param {string} state - State parameter
     * @returns {Object} Token response
     */
    async exchangeCode(code, state) {
        const axios = require('axios');
        
        const verifier = this.tokenCache.get(`verifier_${state}`);
        if (!verifier) {
            throw new Error('Invalid state - code verifier not found');
        }

        const tokenEndpoint = this._getTokenEndpoint();
        
        const response = await axios.post(tokenEndpoint, new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            code,
            redirect_uri: this.config.redirectUri,
            code_verifier: verifier
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // Clean up verifier
        this.tokenCache.delete(`verifier_${state}`);

        return response.data;
    }

    /**
     * Get token endpoint based on IDP
     */
    _getTokenEndpoint() {
        if (!this.config.issuer) {
            return 'https://auth.phoenix.local/token';
        }

        switch (this.config.idpType) {
            case 'auth0':
                return `${this.config.issuer}/oauth/token`;
            case 'stytch':
                return `${this.config.issuer}/oauth2/token`;
            case 'entra':
                return `${this.config.issuer}/oauth2/v2.0/token`;
            default:
                return `${this.config.issuer}/token`;
        }
    }

    /**
     * Generate PKCE code challenge
     */
    _generateCodeChallenge() {
        const verifier = crypto.randomBytes(32).toString('base64url');
        const challenge = crypto
            .createHash('sha256')
            .update(verifier)
            .digest('base64url');
        
        return { verifier, challenge };
    }

    /**
     * Generate state parameter
     */
    _generateState() {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Get OpenID Connect discovery document URL
     */
    getDiscoveryUrl() {
        if (!this.config.issuer) {
            return null;
        }
        return `${this.config.issuer}/.well-known/openid-configuration`;
    }

    /**
     * Fetch and cache OpenID Connect configuration
     */
    async getOIDCConfig() {
        const cached = this.tokenCache.get('oidc_config');
        if (cached) {
            return cached;
        }

        const axios = require('axios');
        const discoveryUrl = this.getDiscoveryUrl();
        
        if (!discoveryUrl) {
            return null;
        }

        const response = await axios.get(discoveryUrl);
        this.tokenCache.set('oidc_config', response.data);
        
        return response.data;
    }
}

module.exports = { MCPAuthHandler };
