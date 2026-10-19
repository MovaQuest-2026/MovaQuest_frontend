INCLUDE _variables.ink
{ alpha_new:
    Take a «пиріжок» for the road! And don't forget the old wall. # speaker:npc_yarynka
    -> offer
}
{ not alpha_easy:
    Hi! Talk to Marta on the bench first, she starts with the easy letters. # speaker:npc_yarynka
    -> END
}
Hey! I'm Yarynka. Everything on this blanket teaches a letter. # speaker:npc_yarynka
-> lesson(false)

=== offer ===
Want to try the exercises again? Just for practice, the score stays. # speaker:npc_yarynka
* [Yes, once more. (Так, ще раз.)]
    -> lesson(true)
* [Not now. (Не зараз.)]
    -> END

=== lesson(practice) ===
Б is b, «банан». Д is d, «диня», a melon. Г is a soft h, «гарбуз», a pumpkin. Ґ is a hard g, like in "go".
Ж is zh, like the s in "pleasure". З is z. Л is l. П is p. Ф is f.
И is a short y, like i in "bit". Й is y, like in "boy".
Ц is ts, Ч is ch, Ш is sh. And Щ is shch, the end of «борщ»!
Which letter sounds like sh? # quiz:alpha_new_1
{ quiz_ok:
    Ш! Three teeth, sh-sh-sh.
    { not practice:
        ~ alpha_score += 1
    }
- else:
    It's Ш. Щ has a little tail and sounds like shch.
}
So which letter ends the word «борщ»? # quiz:alpha_new_2
{ quiz_ok:
    Щ! Now you can order borshch anywhere.
    { not practice:
        ~ alpha_score += 1
    }
- else:
    It's Щ, with the little tail.
}
And Г, like in «гарбуз». How does it sound? # quiz:alpha_new_3
{ quiz_ok:
    Right, a soft breathy h.
    { not practice:
        ~ alpha_score += 1
    }
- else:
    It's a soft h. The hard g is Ґ, with a hook on top.
}
~ alpha_new = true
Fifteen more letters! The last five are carved on the old stone wall. # give:pyrizhok
-> END
