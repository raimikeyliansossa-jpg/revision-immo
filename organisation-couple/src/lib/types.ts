export type Couple = {
  id: string;
  invite_code: string;
  cover_path: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  couple_id: string | null;
  display_name: string;
  emoji: string;
};

export type Activity = {
  id: string;
  couple_id: string;
  name: string;
  emoji: string;
  months: number[];
  location: "interieur" | "exterieur";
  budget: "petit" | "gros";
  created_at: string;
};

export type StepKey =
  | "relecture"
  | "sortie"
  | "humeur"
  | "objectifs"
  | "bilan"
  | "prochaine"
  | "outfits"
  | "rdv"
  | "recap";

export type Point = {
  id: string;
  couple_id: string;
  week_date: string;
  steps: StepKey[];
  current_step: number;
  max_step: number;
  status: "en_cours" | "termine";
  created_at: string;
  completed_at: string | null;
};

export type Answer = {
  point_id: string;
  user_id: string;
  couple_id: string;
  review_status: "tenu" | "moitie" | "pas_tenu" | null;
  mood: string | null;
  week_score: number | null;
  goals_review: string;
  good_things: string;
  less_good: string;
  next_improvement: string;
  next_goals: string;
  ready_step: number | null;
  updated_at: string;
};

export type AnswerField = Exclude<keyof Answer, "point_id" | "user_id" | "couple_id" | "ready_step" | "updated_at">;

export type Outing = {
  id: string;
  couple_id: string;
  date: string;
  activity_id: string | null;
  activity_name: string | null;
  activity_emoji: string | null;
  steps_goal: number | null;
  status: "prevue" | "faite" | "pas_faite";
  point_id: string | null;
  reviewed_point_id: string | null;
  created_at: string;
};

export type OutingRating = {
  outing_id: string;
  user_id: string;
  couple_id: string;
  score: number | null;
  comment: string;
};

export type OutfitReaction = {
  outfit_id: string;
  user_id: string;
  couple_id: string;
  emoji: string | null;
  comment: string;
  updated_at: string;
};

export type OutfitComment = {
  id: string;
  outfit_id: string;
  user_id: string;
  couple_id: string;
  body: string;
  created_at: string;
};

export type Song = {
  id: string;
  couple_id: string;
  user_id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  artist_picture: string | null;
  preview_url: string | null;
  link: string | null;
  note: string;
  reaction: string | null;
  listened_at: string | null;
  created_at: string;
};

export type SongComment = {
  id: string;
  song_id: string;
  user_id: string;
  couple_id: string;
  body: string;
  created_at: string;
};

export type Photo = {
  id: string;
  couple_id: string;
  user_id: string;
  path: string;
  caption: string;
  created_at: string;
  /** Outfits uniquement : jour où la tenue a été portée (AAAA-MM-JJ) */
  worn_on?: string;
};
