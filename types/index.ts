export interface Meeting {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  topic: string;
  attendees: string[];
  place: string | null;
  amount: number;
  store_name: string;
  store_name_short: string | null;
  card_last4: string | null;
  handler: string | null;
  minutes_content: string | null;
  future_plans: string | null;
  drive_folder_id: string | null;
  drive_folder_url: string | null;
  pdf_drive_id: string | null;
  pdf_url: string | null;
  receipt_drive_id: string | null;
  approval_doc_drive_id: string | null;
  folder_sequence: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ParsedData {
  receipt: {
    date: string;
    startTime: string;
    storeName: string;
    storeFullName: string;
    amount: number;
    cardLast4: string;
    handler: string;
  };
  approval: {
    date: string;
    startTime: string;
    endTime: string;
    attendees: string[];
    topic: string;
    place: string;
    purpose: string;
  };
  minutesContent: string;
  futurePlans: string;
}
