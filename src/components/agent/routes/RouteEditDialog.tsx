'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { toast } from 'sonner'
import {
  addBuyerToRouteAction,
  swapBuyerInRouteAction,
  getActivityTypes,
} from '@/lib/actions/visits'
import { getBuyersList } from '@/lib/actions/buyers'
import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  buyer_id: z.string().min(1, 'Please select a buyer'),
  activity_type: z.string().min(1, 'Activity type is required'),
  visit_category: z.string().min(1, 'Please select a visit category'),
  reason: z.string().min(5, 'Please provide a valid reason (min 5 chars)'),
})

type FormValues = z.infer<typeof formSchema>

interface RouteEditDialogProps {
  mode: 'add' | 'swap'
  visitId?: string
  scheduledDate: string
  currentBuyerName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function RouteEditDialog({
  mode,
  visitId,
  scheduledDate,
  currentBuyerName,
  open,
  onOpenChange,
  onSuccess,
}: RouteEditDialogProps) {
  const queryClient = useQueryClient()
  const [buyerSearch, setBuyerSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedBuyerName, setSelectedBuyerName] = useState('')

  const { data: activityTypes = [] } = useQuery({
    queryKey: ['activityTypes'],
    queryFn: getActivityTypes,
  })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(buyerSearch), 500)
    return () => clearTimeout(timer)
  }, [buyerSearch])

  const { data: buyersData } = useQuery({
    queryKey: ['buyersSearch', debouncedSearch],
    queryFn: () => getBuyersList(debouncedSearch, 50, 0),
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { buyer_id: '', activity_type: '', visit_category: '', reason: '' },
  })

  useEffect(() => {
    if (open) {
      reset()
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBuyerSearch('')
      setDebouncedSearch('')
      setSelectedBuyerName('')
    }
  }, [open, reset])

  const buyerOptions = buyersData?.data || []
  const selectOptions = Array.from(new Set([
    ...(selectedBuyerName ? [selectedBuyerName] : []),
    ...buyerOptions.map(b => b.name)
  ]))

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (mode === 'add') {
        return await addBuyerToRouteAction(
          data.buyer_id,
          scheduledDate,
          data.activity_type,
          data.reason,
          data.visit_category
        )
      } else {
        if (!visitId) throw new Error('Missing Visit ID for swap')
        return await swapBuyerInRouteAction(
          visitId,
          data.buyer_id,
          data.activity_type,
          data.reason,
          data.visit_category
        )
      }
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Route ${mode === 'add' ? 'added' : 'swapped'} successfully`)
        queryClient.invalidateQueries({ queryKey: ['visits'] })
        if (onSuccess) onSuccess()
        onOpenChange(false)
      } else {
        toast.error(result.error || `Failed to ${mode} route`)
      }
    },
    onError: (error) => {
      toast.error(`Failed to ${mode} route`)
      console.error(error)
    },
  })

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-w-md bg-white rounded-3xl p-6 shadow-2xl border-0 overflow-visible"
      >
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${mode === 'add' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
              <CheckCircle className="h-5 w-5" />
            </div>
            <span className="text-gray-900">
              {mode === 'add' ? 'Add to Route Plan' : 'Swap Route Stop'}
            </span>
          </DialogTitle>
          <p className="text-sm text-gray-500 font-medium">
             {mode === 'add' ? `Adding visit for ${scheduledDate}` : `Swapping out ${currentBuyerName}`}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wider text-gray-400 font-bold ml-1">
               Select New Buyer
            </label>
            <SearchableSelect 
              options={selectOptions}
              value={selectedBuyerName}
              onChange={(name) => {
                const buyer = buyerOptions.find((b) => b.name === name)
                if (buyer) {
                  setValue('buyer_id', buyer.id, { shouldValidate: true })
                  setSelectedBuyerName(buyer.name)
                } else if (!name) {
                  setValue('buyer_id', '', { shouldValidate: true })
                  setSelectedBuyerName('')
                } else {
                  // Fallback if name isn't found in current buyerOptions (e.g. they selected it then searched away)
                  // It expects the user won't select an invalid one, but this edge case is safe because
                  // we only set the ID if we have the buyer record. We can just retain current if missing.
                }
              }}
              onSearch={setBuyerSearch}
              placeholder="Search for buyer..."
            />
            {errors.buyer_id && <p className="text-xs text-red-500 ml-1">{errors.buyer_id.message}</p>}
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-gray-400 font-bold ml-1">Activity Type</label>
            <Controller
              name="activity_type"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  options={activityTypes}
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Select activity type..."
                />
              )}
            />
            {errors.activity_type && <p className="text-xs text-red-500 mt-1 ml-1">{errors.activity_type.message}</p>}
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-gray-400 font-bold ml-1">Visit Category</label>
            <Controller
              name="visit_category"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  options={['First Time', 'Repeat Visit']}
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Select visit category..."
                />
              )}
            />
            {errors.visit_category && <p className="text-xs text-red-500 mt-1 ml-1">{errors.visit_category.message}</p>}
          </div>

          <div>
             <label className="text-xs uppercase tracking-wider text-gray-400 font-bold ml-1">Reason for Editing (Required)</label>
             <textarea 
                {...register('reason')} 
                placeholder={mode === 'add' ? "Why was this buyer added?" : "Why was this route swapped?"}
                className="w-full resize-none p-3 h-24 mt-1 rounded-xl border-2 border-gray-100 bg-gray-50 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 text-base outline-none transition-all"
             />
             {errors.reason && <p className="text-xs text-red-500 mt-1 ml-1">{errors.reason.message}</p>}
          </div>

          <Button type="submit" className="w-full h-12 text-base rounded-xl" isLoading={mutation.isPending}>
            {mode === 'add' ? 'Add to Route' : 'Confirm Swap'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
