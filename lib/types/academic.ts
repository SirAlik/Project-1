export interface SchoolStage {
  id:         string;
  school_id:  string;
  name:       string;
  code:       'elementary' | 'middle' | 'high';
  grade_from: number;
  grade_to:   number;
}

export interface Term {
  id:               string;
  school_id:        string;
  academic_year_id: string;
  number:           1 | 2 | 3;
  name:             string;
  start_date:       string | null;
  end_date:         string | null;
  is_active:        boolean;
}

export interface Period {
  id:              string;
  school_id:       string;
  school_stage_id: string;
  number:          number;
  label:           string;
  start_time:      string | null;
  end_time:        string | null;
}
