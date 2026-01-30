export interface AorInfo {
  domain_id: number
  auth_username: string
  auth_password: string
}

export interface ApnInfo {
  name: string
  speed_up: number | 'max'
  speed_down: number | 'max'
}

export interface NetworkAccessList {
  zoneNL: boolean
  zone1: boolean
  zone2: boolean
  zone3: boolean
  zone4: boolean
  zone5: boolean
}

export type BlockScope = 'outside_eu_regulation' | 'all' | null

export interface BlockDataUsage {
  enabled: boolean
  block_until: string | null
  scope: BlockScope
}

export interface ContractInfo {
  service_package: number
  service_profile: number
  contract_start: string
  duration: number
}

export interface CreditInfo {
  max_credit: number
}

export interface Subscriber {
  iccid: string
  imsi: string
  msisdn: string
  cust_id: string
  admin_info: string
  subscriber_state: boolean
  aor: AorInfo
  apn: ApnInfo | null
  network_access_list: NetworkAccessList
  block_data_usage: BlockDataUsage
  contract: ContractInfo
  credit: CreditInfo
}

export interface SubscriberResponse {
  data: Subscriber
  status: string
  reason: string | null
  request_id: string
  cached: boolean
}
