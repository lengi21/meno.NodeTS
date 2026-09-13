export type AuthTokenKind = 'restaurant-device' | 'pos-user';

export interface AuthClaims {
  readonly sub: string;
  readonly restaurantId: string;
  readonly deviceId: string;
  readonly kind: AuthTokenKind;
  readonly memberId?: string;
}

export interface AuthenticatedRequest {
  auth?: AuthClaims;
}
