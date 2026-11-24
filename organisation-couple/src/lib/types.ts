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
  | "objectifs_suivants"
  | "bilan"
  | "amelioration"
  | "prochaine"
  | "outfits"
  | "rdv"
  | "recap"
  // Point du mercredi « Mi-temps »
  | "mi_constat"
  | "mi_note"
  | "mi_plan"
  // Bilan du mois
  | "mois_rappel"
  | "mois_chiffres"
  | "mois_recit"
  | "mois_perso"
  | "mois_couple"
  | "mois_ameliorations"
  | "mois_points_noirs"
  | "mois_objectifs"
  // Point du trimestre
  | "tri_rappel"
  | "tri_score"
  | "tri_analyse"
  | "tri_avis"
  | "tri_vision"
  // Bilan qui remplace le point du dimanche : note de la 2e partie de semaine
  | "note_semaine";

export type PointKind = "semaine" | "mercredi" | "mois" | "trimestre";

export type Point = {
  id: string;
  couple_id: string;
  /** semaine : le dimanche · mercredi : le mercredi · mois / trimestre : le dernier jour */
  week_date: string;
  kind: PointKind;
  /** Bilan fait un dimanche à la place du point de la semaine : le dimanche concerné */
  covers_week: string | null;
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
  /** Ancien champ unique (points faits avant la séparation en 3 cases) */
  goals_review: string;
  goals_done: string;
  goals_missed: string;
  goals_why: string;
  good_things: string;
  less_good: string;
  next_improvement: string;
  next_goals: string;
  /** Note de la 1re partie de semaine (lundi → mercredi) */
  half1_score: number | null;
  mid_review: string;
  mid_plan: string;
  month_pride: string;
  month_stuck: string;
  month_best: string;
  month_recurring: string;
  month_improved: string;
  month_goals: string;
  avis_good: string;
  avis_evolve: string;
  q_live: string;
  q_become: string;
  q_goals: string;
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
  /** Lieu / détails de la sortie (ex. « Musée d'Orsay — expo Monet ») */
  place?: string;
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
  /** Souvenirs uniquement : jour du souvenir (AAAA-MM-JJ) */
  taken_on?: string;
  /** Souvenirs uniquement : sortie à laquelle la photo est rattachée */
  outing_id?: string | null;
};

export type PointItem = {
  id: string;
  couple_id: string;
  point_id: string;
  kind: "point_noir" | "objectif_couple" | "vision_couple";
  body: string;
  solution: string;
  status: "regle" | "revient" | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
