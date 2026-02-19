'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import { updateBuyerContact, getContactDesignations, BuyerOption } from '@/lib/actions/buyers'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PhoneInput, isValidPhoneNumber } from '@/components/ui/PhoneInput'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { toast } from 'sonner'
import { User } from 'lucide-react'

const formSchema = z.object({
  contact_name: z.string().min(2, 'Name is required'),
  phone: z.string().refine((val) => isValidPhoneNumber(val), { message: 'Invalid phone number' }),
  designation: z.string().optional()
})

type FormValues = z.infer<typeof formSchema>

interface EditContactDialogProps {
    buyer: BuyerOption | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditContactDialog({ buyer, open, onOpenChange }: EditContactDialogProps) {
    const queryClient = useQueryClient()
    const { data: designations = [] } = useQuery({ queryKey: ['contactDesignations'], queryFn: getContactDesignations })

    const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            contact_name: '',
            phone: '',
            designation: ''
        }
    })

    useEffect(() => {
        if (buyer && open) {
            reset({
                contact_name: buyer.contact_name || '',
                phone: buyer.phone || '',
                designation: buyer.contact_designation || ''
            })
        }
    }, [buyer, open, reset])

    const mutation = useMutation({
        mutationFn: (data: FormValues) => updateBuyerContact(buyer!.id, {
            name: data.contact_name,
            phone: data.phone,
            designation: data.designation
        }),
        onSuccess: (result) => {
            if (result.success) {
                toast.success('Contact updated successfully')
                queryClient.invalidateQueries({ queryKey: ['buyers'] })
                onOpenChange(false)
            } else {
                toast.error(result.error || 'Failed to update contact')
            }
        },
        onError: (error) => {
            toast.error('Failed to update contact')
            console.error(error)
        }
    })

    const onSubmit = (data: FormValues) => {
        if (!buyer) return
        mutation.mutate(data)
    }

    if (!buyer) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Update Contact: {buyer.name}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700">Contact Name</label>
                        <div className="relative mt-1">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <Input {...register('contact_name')} placeholder="e.g. John Doe" className="pl-9" />
                        </div>
                        {errors.contact_name && <p className="text-xs text-red-500 mt-1">{errors.contact_name.message}</p>}
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700">Phone</label>
                        <Controller
                            name="phone"
                            control={control}
                            render={({ field }) => (
                                <PhoneInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Enter phone number"
                                    error={errors.phone?.message}
                                />
                            )}
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700">Designation</label>
                        <Controller
                            name="designation"
                            control={control}
                            render={({ field }) => (
                                <SearchableSelect
                                    options={designations}
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    placeholder="Select designation..."
                                />
                            )}
                        />
                    </div>

                    <Button type="submit" className="w-full mt-4" isLoading={mutation.isPending}>
                        Update Contact
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
