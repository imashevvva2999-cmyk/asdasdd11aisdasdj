import type { ActivityEvent, Entity, Localized } from '@mmusic/backoffice/domain';
import type { ReviewFields } from '@mmusic/backoffice/review';

/**
 * ARM data (all fictional demo records, `mock: true`). Real catalog artists are not stored here: ARM reads their
 * public metadata from @mmusic/core and never attaches invented moderation or verification decisions to them.
 */

export type SubmissionKind = 'track' | 'release';
export type ReleaseType = 'single' | 'ep' | 'album';

/** A track or release submitted for moderation by a fictional demo artist. */
export type Submission = Entity &
  ReviewFields & {
    kind: SubmissionKind;
    title: string;
    /** DemoArtist.id — or, for a demo submission built on a catalog track, that track's catalog artist id. */
    artistId: string;
    /** Demo submission built on this catalog track (@mmusic/core): same title, artist, duration and demo audio. */
    catalogTrackId?: string;
    genre: string;
    submittedAt: string;
    explicit?: boolean;
    /** Tracks only. */
    durationSec?: number;
    /** Releases only. */
    releaseType?: ReleaseType;
    trackCount?: number;
    /** The artist's note to moderators. */
    note?: Localized;
    /** Approved items only: listed in the prototype's demo catalog (default) or taken down by staff (M3). */
    listing?: ListingStatus;
    listingReason?: string;
    listingChangedAt?: string;
  };

export type ListingStatus = 'listed' | 'unlisted';

/** Promotion tools of the app (core/mocks/promotions.ts PROMO_TOOLS ids). */
export type PromoToolId = 'recommendation-boost' | 'editorial-pitch' | 'home-banner';

/**
 * A fictional promotion campaign request "on review" (M3). It promotes one of the demo artist's own submissions;
 * the budget is the fictional amount the demo artist asked for. No campaign has run: there are no reach,
 * stream or audience figures anywhere in the prototype.
 */
export type Campaign = Entity &
  ReviewFields & {
    /** DemoArtist.id */
    artistId: string;
    /** The promoted Submission.id */
    submissionId: string;
    toolId: PromoToolId;
    /** Undefined for tools without a budget (editorial pitch uses curator slots). */
    requestedBudgetKgs?: number;
    durationDays: number;
    startsAt: string;
    regions: string[];
    pitch: Localized;
    submittedAt: string;
  };

export type TransactionStatus = 'completed' | 'pending' | 'failed';

/**
 * A fictional fan donation to a fictional demo artist (the donation flow of the app, FR-12, in KGS). View only:
 * nothing in ARM creates, changes, refunds or sends money. No platform fee is shown (not decided, OQ-10).
 */
export type DemoTransaction = Entity & {
  reference: string;
  kind: 'donation';
  amountKgs: number;
  status: TransactionStatus;
  createdAt: string;
  /** DemoUser.id of the fan */
  payerUserId: string;
  /** DemoArtist.id */
  recipientArtistId: string;
  /** Masked MBANK account of the payer: "•••• 0042". */
  accountMask: string;
  failureReason?: Localized;
};

/** A fictional artist profile awaiting (or after) verification review. */
export type DemoArtist = Entity &
  ReviewFields & {
    name: string;
    genres: string[];
    city: string;
    submittedAt: string;
    bio: Localized;
  };

export type UserRole = 'listener' | 'artist' | 'staff';
export type UserStatus = 'active' | 'suspended';

/** A fictional platform account (listener, artist or staff). */
export type DemoUser = Entity & {
  name: string;
  email: string;
  city: string;
  role: UserRole;
  status: UserStatus;
  registeredAt: string;
  lastActiveAt: string;
  /** role 'artist': DemoArtist.id */
  artistId?: string;
  /** role 'staff': StaffUser.id (its provisional staff role comes from the staff record) */
  staffId?: string;
  statusReason?: string;
  statusChangedAt?: string;
};

export type ArmCollections = {
  submissions: Submission[];
  artists: DemoArtist[];
  campaigns: Campaign[];
  transactions: DemoTransaction[];
  users: DemoUser[];
  activity: ActivityEvent[];
};
