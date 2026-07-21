export type FormStatus = 'Pending' | 'Processing' | 'Filed' | 'Paid';

export type TaxPayerType = 'Individual' | 'Corporate';

export interface BIRForm {
  id: string;
  code: string;
  description: string;
  status: FormStatus;
  deadline: string;
}

export interface FormReference {
  code: string;
  description: string;
  frequency: string;
  deadlineRule: string;
}

export interface Client {
  id: string;
  name: string;
  tin: string;
  rdo: string;
  type: TaxPayerType;
  forms: BIRForm[];
}
