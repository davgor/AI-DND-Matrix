export type DeleteCampaignFailureCode = 'not_found' | 'delete_failed'

export interface DeleteCampaignSuccess {
  ok: true
}

export interface DeleteCampaignFailure {
  ok: false
  code: DeleteCampaignFailureCode
  message: string
}

export type DeleteCampaignResult = DeleteCampaignSuccess | DeleteCampaignFailure
