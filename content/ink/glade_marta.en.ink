INCLUDE _variables.ink
{ alpha_easy and alpha_new and alpha_special:
    That's all 33 letters! The bus stop is down the path. Say hi to Vinnytsia for me. # speaker:npc_marta
    -> offer
}
{ alpha_easy:
    Yarynka is by the red blanket, and the old wall has the last letters carved in it. # speaker:npc_marta
    -> offer
}
Hi! I'm Marta. Your bus to Vinnytsia leaves soon, so let's learn the Ukrainian alphabet, «абетка». It has 33 letters. # speaker:npc_marta
-> lesson(false)

=== offer ===
Want to try the exercises again? Just for practice, the score stays. # speaker:npc_marta
* [Yes, once more. (Так, ще раз.)]
    -> lesson(true)
* [Not now. (Не зараз.)]
    -> END

=== lesson(practice) ===
Good news first: five letters look and sound almost like English. А, К, М, О, Т.
«Мама» is mum, «кіт» is cat. Try reading this one. # quiz:alpha_easy_1
{ quiz_ok:
    Perfect!
    { not practice:
        ~ alpha_score += 1
    }
- else:
    It's «мама», mama. М is m, А is a.
}
Now the tricky ones. They look English, but they lie. В is v, Н is n, Р is r, С is s.
У is oo, Х is kh, Е is e as in "met", І is ee.
So how does «Р» sound? # quiz:alpha_false_1
{ quiz_ok:
    Yes, r! Not p.
    { not practice:
        ~ alpha_score += 1
    }
- else:
    It's r. «Р» only looks like an English P.
}
And this one means "she". # quiz:alpha_false_2
{ quiz_ok:
    «Вона», vona. You're reading Ukrainian!
    { not practice:
        ~ alpha_score += 1
    }
- else:
    «Вона», vona. В is v, Н is n.
}
~ alpha_easy = true
Thirteen letters done. Yarynka by the red blanket knows the new shapes, and the old wall keeps the rest. # flag:glade_met_marta
-> END
