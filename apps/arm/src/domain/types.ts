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
  users: DemoUser[];
  activity: ActivityEvent[];
};
