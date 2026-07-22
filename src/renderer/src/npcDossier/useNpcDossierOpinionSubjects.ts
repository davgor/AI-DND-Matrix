import { useCallback, useEffect, useState } from 'react'
import type { NpcDossierOpinion } from '../../../shared/npcDossier/types'
import type { OpinionSubject, OpinionSubjectOption } from '../../../shared/npcRelationships/types'
import { playerOpinionSubject } from '../../../shared/npcRelationships/types'
import { opinionSubjectOptionKey } from './NpcDossierOpinionSection'

export interface OpinionSubjectsInput {
  campaignId: string
  characterId: string
  npcId: string | null
  isOpen: boolean
  aboutYouOpinion: NpcDossierOpinion | null
}

function parseSubjectKey(key: string): OpinionSubject | null {
  const sep = key.indexOf(':')
  if (sep <= 0) return null
  const subjectType = key.slice(0, sep)
  const subjectId = key.slice(sep + 1)
  if (subjectType !== 'player_character' && subjectType !== 'npc') return null
  return subjectId ? { subjectType, subjectId } : null
}

function useSubjectOptions(
  campaignId: string,
  characterId: string,
  npcId: string | null,
  isOpen: boolean
): OpinionSubjectOption[] {
  const [subjects, setSubjects] = useState<OpinionSubjectOption[]>([])
  useEffect(() => {
    if (!isOpen || !npcId) {
      setSubjects([])
      return
    }
    let cancelled = false
    void window.npcDossier
      .listOpinionSubjects({ campaignId, characterId, npcId })
      .then((options) => {
        if (!cancelled) setSubjects(options)
      })
      .catch(() => {
        if (!cancelled) {
          setSubjects([{ subject: playerOpinionSubject(characterId), label: 'About you' }])
        }
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, npcId, campaignId, characterId])
  return subjects
}

interface FetchArgs {
  campaignId: string
  characterId: string
  npcId: string
  subject: OpinionSubject
}

function fetchSubjectOpinion(
  args: FetchArgs,
  setOpinion: (value: NpcDossierOpinion | null) => void,
  setLoading: (value: boolean) => void
): void {
  setLoading(true)
  void window.npcDossier
    .getSubjectOpinion(args)
    .then((result) => setOpinion(result))
    .catch(() => setOpinion({ summary: null, generatedAt: null, stale: false }))
    .finally(() => setLoading(false))
}

interface SelectSubjectDeps {
  input: OpinionSubjectsInput
  defaultKey: string
  setSelectedKey: (key: string) => void
  setOpinion: (value: NpcDossierOpinion | null) => void
  setLoadingSubject: (value: boolean) => void
}

function useSelectSubject(deps: SelectSubjectDeps): (key: string) => void {
  return useCallback(
    (key: string) => {
      deps.setSelectedKey(key)
      const subject = parseSubjectKey(key)
      if (!deps.input.npcId || !subject) return
      if (key === deps.defaultKey) {
        deps.setOpinion(deps.input.aboutYouOpinion)
        return
      }
      fetchSubjectOpinion(
        {
          campaignId: deps.input.campaignId,
          characterId: deps.input.characterId,
          npcId: deps.input.npcId,
          subject
        },
        deps.setOpinion,
        deps.setLoadingSubject
      )
    },
    [deps]
  )
}

export function useNpcDossierOpinionSubjects(input: OpinionSubjectsInput): {
  subjects: OpinionSubjectOption[]
  selectedKey: string
  opinion: NpcDossierOpinion | null
  loadingSubject: boolean
  selectSubject: (key: string) => void
} {
  const aboutYou = playerOpinionSubject(input.characterId)
  const defaultKey = `${aboutYou.subjectType}:${aboutYou.subjectId}`
  const loaded = useSubjectOptions(
    input.campaignId,
    input.characterId,
    input.npcId,
    input.isOpen
  )
  const [selectedKey, setSelectedKey] = useState(defaultKey)
  const [opinion, setOpinion] = useState(input.aboutYouOpinion)
  const [loadingSubject, setLoadingSubject] = useState(false)

  useEffect(() => {
    setSelectedKey(defaultKey)
    setOpinion(input.aboutYouOpinion)
  }, [defaultKey, input.aboutYouOpinion, input.npcId, input.isOpen])

  const selectSubject = useSelectSubject({
    input,
    defaultKey,
    setSelectedKey,
    setOpinion,
    setLoadingSubject
  })

  return {
    subjects: loaded.length > 0 ? loaded : [{ subject: aboutYou, label: 'About you' }],
    selectedKey,
    opinion: opinion ?? input.aboutYouOpinion,
    loadingSubject,
    selectSubject
  }
}

export function defaultOpinionSubjectKey(characterId: string): string {
  return opinionSubjectOptionKey({
    subject: playerOpinionSubject(characterId),
    label: 'About you'
  })
}
