INCLUDE _variables.ink
{ alpha_easy and alpha_new and alpha_special:
    Усі 33 літери! Зупинка внизу стежки. Передавай привіт Вінниці. # speaker:npc_marta
    -> offer
}
{ alpha_easy:
    Яринка біля червоного пледа, а останні літери вирізьблені на старій стіні. # speaker:npc_marta
    -> offer
}
Привіт! Я Марта. Автобус до Вінниці скоро, тож повторимо абетку. У ній 33 літери. # speaker:npc_marta
-> lesson(false)

=== offer ===
Хочеш повторити вправи ще раз? Це лише тренування, рахунок не змінюється. # speaker:npc_marta
* [Так, ще раз.]
    -> lesson(true)
* [Не зараз.]
    -> END

=== lesson(practice) ===
Почнімо з простих: А, К, М, О, Т. Прочитай слово. # quiz:alpha_easy_1
{ quiz_ok:
    Чудово!
    { not practice:
        ~ alpha_score += 1
    }
- else:
    Це «мама».
}
Тепер підступні: В, Н, Р, С, У, Х, Е, І. Іноземці часто читають їх як латиницю.
Як звучить «Р»? # quiz:alpha_false_1
{ quiz_ok:
    Так, [р].
    { not practice:
        ~ alpha_score += 1
    }
- else:
    Це [р], а не [п].
}
А це слово означає «she». # quiz:alpha_false_2
{ quiz_ok:
    «Вона». Правильно!
    { not practice:
        ~ alpha_score += 1
    }
- else:
    «Вона»: В — [в], Н — [н].
}
~ alpha_easy = true
Тринадцять літер є. Яринка біля червоного пледа знає нові, а решта на старій стіні. # flag:glade_met_marta
-> END
