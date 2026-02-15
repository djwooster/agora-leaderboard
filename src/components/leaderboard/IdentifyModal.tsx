"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase"
import { Participant } from "@/types"

const EMOJIS = ["💪", "🏃", "🔥", "⚡", "🎯", "🏋️", "🚴", "🧘", "🥊", "🏊"]

interface IdentifyModalProps {
  open: boolean
  challengeId: string
  participants: Participant[]
  onIdentified: (participant: Participant) => void
}

export function IdentifyModal({ open, challengeId, participants, onIdentified }: IdentifyModalProps) {
  const [newName, setNewName] = useState("")
  const [selectedEmoji, setSelectedEmoji] = useState("💪")
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")

  async function handleAddSelf() {
    const trimmed = newName.trim()
    if (!trimmed) {
      setError("Please enter your name.")
      return
    }
    setError("")
    setAdding(true)

    const { data, error: dbError } = await supabase
      .from("participants")
      .insert({ challenge_id: challengeId, name: trimmed, avatar_emoji: selectedEmoji })
      .select()
      .single()

    if (dbError) {
      if (dbError.code === "23505") {
        setError("That name is already taken. Pick a different one.")
      } else {
        setError("Something went wrong. Try again.")
      }
      setAdding(false)
      return
    }

    onIdentified(data as Participant)
  }

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Who are you?</DialogTitle>
          <DialogDescription>
            Pick your name to start logging or join the challenge.
          </DialogDescription>
        </DialogHeader>

        {participants.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Already in this challenge
            </p>
            <div className="space-y-1">
              {participants.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onIdentified(p)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted transition-colors text-left"
                >
                  <span className="text-lg">{p.avatar_emoji}</span>
                  <span className="text-sm font-medium">{p.name}</span>
                </button>
              ))}
            </div>
            <Separator className="my-3" />
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Join as someone new
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="new-name">Your name</Label>
            <Input
              id="new-name"
              placeholder="e.g. Alex"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSelf()}
              autoFocus={participants.length === 0}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Pick an emoji</Label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`text-xl p-1.5 rounded-md transition-colors ${
                    selectedEmoji === emoji
                      ? "bg-foreground/10 ring-2 ring-foreground/20"
                      : "hover:bg-muted"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleAddSelf}
            disabled={adding || !newName.trim()}
            className="w-full"
          >
            {adding ? "Joining..." : "Join challenge"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
