INCLUDE _variables.ink
{ not picnic_taught:
    «Привіт! Мама чекає біля ковдри.» (Hi! Mom is waiting by the blanket.) Maybe you should talk to her first. # speaker:npc_ivanka
    -> END
}
{ ivanka_called:
    «Ходімо!» (Let's go!) # speaker:npc_ivanka
    -> END
}
Ivanka is kicking a ball under the tree. She hasn't noticed you. # speaker:narrator
You walk up to her. How do you call her? # quiz:picnic_call_1
{ quiz_ok:
    «Іванко, ходи сюди!» She turns around.
- else:
    It's «Іванко, ходи сюди», with «Іванко», not «Іванка». She turns around anyway.
}
«Що?» (What?) # speaker:npc_ivanka
-> tell

=== tell ===
* [Пікнік готовий! (The picnic is ready!)]
    -> ready
* [Your mom says the food is ready.]
    «Що? Я не розумію.» (What? I don't understand.) # speaker:npc_ivanka
    She really doesn't speak English. Say it in Ukrainian. # speaker:narrator
    -> tell

=== ready ===
«Пікнік? Ура!» (Picnic? Hooray!) # speaker:npc_ivanka
«Дивись! Це мій м'яч.» (Look! This is my ball.)
* [Гарний м'яч. Ходімо! (Nice ball. Let's go!)]
* [Ходімо! (Let's go!)]
-
«Ходімо!» (Let's go!)
~ ivanka_called = true
Ivanka runs to the blanket. Follow her and talk to her mom. # speaker:narrator
-> END
