export type QualityDomain =
  | 'attendance'
  | 'behavior'
  | 'academic'
  | 'health'
  | 'lrc'
  | 'activity'
  | 'environment';

export type QualitySourceModule =
  | 'attendance'
  | 'lrc'
  | 'health'
  | 'behavior'
  | 'counselor'
  | 'hr'
  | 'activity';

export interface QualityIndicator {
  id:                 string;
  school_id:          string;
  code:               string;
  name_ar:            string;
  domain:             QualityDomain;
  responsible_role:   string;
  measurement_method: string | null;
  target_value:       number | null;
  is_auto_fillable:   boolean;
  is_active:          boolean;
  created_at:         string;
}

export interface QualityEvidence {
  id:                     string;
  school_id:              string;
  indicator_id:           string;
  source_event_id:        string | null;
  source_module:          QualitySourceModule;
  evidence_date:          string;
  value:                  number;
  notes:                  string | null;
  auto_generated:         boolean;
  academic_year_id:       string;
  recorded_by_persona_id: string | null;
  created_at:             string;
}
