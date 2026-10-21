INCLUDE _variables.ink
{ ivanka_called:
    -> feast
}
{ picnic_taught:
    Ivanka is by the trees. Call her: «Іванко, ходи сюди!» And remember, only in Ukrainian. # speaker:npc_olena
    -> END
}
Привіт! There you are. Everything is ready, I just need my daughter back. Can you call her? She's by the trees. # speaker:npc_olena
* [Привіт! Sure. (Hi! Sure.)]
    Great!
* [Can I just say it in English?]
    In Ukrainian. Ivanka doesn't speak English, not a word. She's six.
- Just tell her the picnic is ready.
* [How do you say "picnic"?]
- That one you get for free. «Пікнік». Almost the same as your English word, just read it with the letters you already know. Пік-нік. Try it. # quiz:picnic_read_1
{ quiz_ok:
    Exactly!
- else:
    «Пікнік», picnic. П is p, І is ee, К is k, Н is n.
}
And "ready" is «готовий». Together: «Пікнік готовий». How would you tell Ivanka the picnic is ready? # quiz:picnic_ready_1
{ quiz_ok:
    Perfect. Short and clear.
- else:
    It's «Пікнік готовий». The other phrases mean something else.
}
One more thing. When you call her, it's «Іванко», not «Іванка». Ukrainian changes a name when you call someone. «Іванко, ходи сюди» means "Ivanka, come here". Which one calls her? # quiz:picnic_call_1
{ quiz_ok:
    Yes! Now go. She's by the trees on the right.
- else:
    It's «Іванко, ходи сюди». Names change when you call someone. Now go, she's by the trees on the right.
}
~ picnic_taught = true
-> END

=== feast ===
Ivanka comes running after you. # speaker:narrator
«Мамо! Пікнік!» (Mom! Picnic!) # speaker:npc_ivanka
I heard you from here. «Пікнік готовий», perfect. # speaker:npc_olena
«А що є?» (And what is there?) # speaker:npc_ivanka
«Салат, лимонад, банани і торт.» Did you catch that? You knew all four already. # speaker:npc_olena
* [All four?]
    Look at the blanket. Try the last one: which word means cake? # quiz:picnic_food_1
* [Салат. Лимонад. Банани. Торт. (Salad. Lemonade. Bananas. Cake.)]
    You read them like a local. Which one is the drink? # quiz:picnic_food_2
-
{ quiz_ok:
    Right!
- else:
    Not quite, but look: «торт» is torte, «лимонад» is lemonade.
}
Ukrainian hands you a few hundred words like that for free, you only have to be able to read them. «Смачного!» (Enjoy your meal!)
* [Смачного! (Enjoy your meal!)]
* [Дякую! (Thank you!)]
- Your first Ukrainian picnic. Well done!
~ picnic_done = true
You called a child, and she understood you. That is the whole idea of this game. # ending:picnic
-> END
