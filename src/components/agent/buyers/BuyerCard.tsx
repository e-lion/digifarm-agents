import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Phone, Edit, MapPin, User } from "lucide-react"
import type { BuyerOption } from "@/lib/actions/buyers"

interface BuyerCardProps {
    buyer: BuyerOption
    onEdit: (buyer: BuyerOption) => void
}

export function BuyerCard({ buyer, onEdit }: BuyerCardProps) {
    return (
        <Card className="bg-white border hover:border-green-300 transition-colors shadow-sm">
            <CardContent className="p-4 flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex flex-col mb-1">
                        <h3 className="font-bold text-gray-900 truncate text-base">{buyer.name}</h3>
                        {buyer.business_type && (
                            <span className="text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full w-fit mt-1">
                                {buyer.business_type}
                            </span>
                        )}
                    </div>
                    
                    <div className="text-sm text-gray-600 mt-2 space-y-1">
                         <p className="truncate flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-gray-400" />
                            <span className="font-medium text-gray-900">{buyer.contact_name || 'Not Set'}</span>
                         </p>
                         {buyer.county && (
                             <p className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {buyer.county}
                             </p>
                         )}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    {buyer.phone ? (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 w-9 p-0 rounded-full border-green-200 text-green-600 hover:bg-green-50"
                            onClick={() => window.open(`tel:${buyer.phone}`)}
                        >
                            <Phone className="h-4 w-4" />
                        </Button>
                    ) : (
                         <div className="h-9 w-9" /> 
                    )}
                    
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 w-9 p-0 rounded-full border-none bg-transparent text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                        onClick={() => onEdit(buyer)}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
