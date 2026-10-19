INCLUDE _variables.ink
{ alpha_new:
    Візьми пиріжок у дорогу! І не забудь про стару стіну. # speaker:npc_yarynka
    -> offer
}
{ not alpha_easy:
    Привіт! Спершу поговори з Мартою на лавці. # speaker:npc_yarynka
    -> END
}
Привіт! Я Яринка. Усе на цьому пледі вчить якусь літеру. # speaker:npc_yarynka
-> lesson(false)

=== offer ===
Хочеш повторити вправи ще раз? Це лише тренування, рахунок не змінюється. # speaker:npc_yarynka
* [Так, ще раз.]
    -> lesson(true)
* [Не зараз.]
    -> END

=== lesson(practice) ===
Б — «банан», Д — «диня», Г — «гарбуз», Ґ — «ґудзик».
Ж, З, Л, П, Ф, И, Й, Ц, Ч, Ш і Щ, як у слові «борщ».
Яка літера звучить як [ш]? # quiz:alpha_new_1
{ quiz_ok:
    Ш!
    { not practice:
        ~ alpha_score += 1
    }
- else:
    Це Ш. Щ має хвостик.
}
Якою літерою закінчується «борщ»? # quiz:alpha_new_2
{ quiz_ok:
    Щ!
    { not practice:
        ~ alpha_score += 1
    }
- else:
    Щ, з хвостиком.
}
А як звучить Г? # quiz:alpha_new_3
{ quiz_ok:
    Так.
    { not practice:
        ~ alpha_score += 1
    }
- else:
    М'яко, як видих. Тверде [ґ] — це Ґ.
}
~ alpha_new = true
Ще п'ятнадцять літер! Останні п'ять на старій стіні. # give:pyrizhok
-> END
