import { useMutation, useQueryClient } from '@tanstack/react-query'

import { eventNoteApi } from '../api'
import type { EventNoteRequest } from '../type/api'
import { EVENT_NOTES_KEY } from './useEventNotes'

export const useCreateEventNote = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: EventNoteRequest) => eventNoteApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: EVENT_NOTES_KEY }),
  })
}
