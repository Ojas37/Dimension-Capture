"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Calendar, Download, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Measurement {
  id: string
  reference_object: string
  target_width: number
  target_height: number
  confidence: number | null
  created_at: string
  annotated_image_url: string | null
}

export function MeasurementHistory() {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      fetchMeasurements()
    }
  }, [user])

  const fetchMeasurements = async () => {
    try {
      const { data, error } = await supabase
        .from("measurements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error
      setMeasurements(data || [])
    } catch (error: any) {
      toast({
        title: "Error loading history",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteMeasurement = async (id: string) => {
    try {
      const { error } = await supabase.from("measurements").delete().eq("id", id)

      if (error) throw error

      setMeasurements(measurements.filter((m) => m.id !== id))
      toast({
        title: "Measurement deleted",
        description: "The measurement has been removed from your history.",
      })
    } catch (error: any) {
      toast({
        title: "Error deleting measurement",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const downloadImage = (imageUrl: string, filename: string) => {
    const link = document.createElement("a")
    link.href = imageUrl
    link.download = filename
    link.click()
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Please sign in to view your measurement history.</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center">Loading your measurement history...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Measurement History
        </CardTitle>
        <CardDescription>Your recent measurements and results</CardDescription>
      </CardHeader>
      <CardContent>
        {measurements.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No measurements yet. Start by uploading your first image!
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Dimensions</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {measurements.map((measurement) => (
                  <TableRow key={measurement.id}>
                    <TableCell>{format(new Date(measurement.created_at), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{measurement.reference_object.replace("-", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      {measurement.target_width} × {measurement.target_height} cm
                    </TableCell>
                    <TableCell>
                      {measurement.confidence ? (
                        <Badge variant={measurement.confidence > 0.8 ? "default" : "secondary"}>
                          {Math.round(measurement.confidence * 100)}%
                        </Badge>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {measurement.annotated_image_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              downloadImage(measurement.annotated_image_url!, `measurement-${measurement.id}.png`)
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => deleteMeasurement(measurement.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
