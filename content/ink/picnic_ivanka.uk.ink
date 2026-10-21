INCLUDE _variables.ink
{ not picnic_taught:
    «Привіт! Мама чекає біля ковдри.» Може, спершу поговори з нею. # speaker:npc_ivanka
    -> END
}
{ ivanka_called:
    «Ходімо!» # speaker:npc_ivanka
    -> END
}
Іванка б'є м'яч під деревом. Вона тебе ще не помітила. # speaker:narrator
Ти підходиш до неї. Як її покликати? # quiz:picnic_call_1
{ quiz_ok:
    «Іванко, ходи сюди!» Вона обертається.
- else:
    Треба «Іванко, ходи сюди», «Іванко», а не «Іванка». Вона все одно обертається.
}
«Що?» # speaker:npc_ivanka
-> tell

=== tell ===
* [Пікнік готовий!]
    -> ready
* [Your mom says the food is ready.]
    «Що? Я не розумію.» # speaker:npc_ivanka
    Вона справді не знає англійської. Скажи українською. # speaker:narrator
    -> tell

=== ready ===
«Пікнік? Ура!» # speaker:npc_ivanka
«Дивись! Це мій м'яч.»
* [Гарний м'яч. Ходімо!]
* [Ходімо!]
-
«Ходімо!»
~ ivanka_called = true
Іванка біжить до ковдри. Іди за нею й поговори з її мамою. # speaker:narrator
-> END
