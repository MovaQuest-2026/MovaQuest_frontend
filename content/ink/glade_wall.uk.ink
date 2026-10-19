INCLUDE _variables.ink
{ alpha_special:
    Під старими літерами хтось видряпав «Вінниця». # speaker:glade_wall
    -> offer
}
-> lesson(false)

=== offer ===
Хочеш повторити вправи ще раз? Це лише тренування, рахунок не змінюється. # speaker:glade_wall
* [Так, ще раз.]
    -> lesson(true)
* [Не зараз.]
    -> END

=== lesson(practice) ===
На старому камені вирізьблено: Є, Ї, Ю, Я, Ь. # speaker:glade_wall
Я — ще й окреме слово. Ї є тільки в українській. Ь нічого не вимовляє, а пом'якшує попередню літеру.
Яка літера є ще й словом? # quiz:alpha_special_1
{ quiz_ok:
    { not practice:
        ~ alpha_score += 1
    }
    Я!
- else:
    Це Я.
}
Як звучить Ї? # quiz:alpha_special_2
{ quiz_ok:
    { not practice:
        ~ alpha_score += 1
    }
    Так, як в «Україна».
- else:
    [йі], як в «Україна».
}
Під літерами видряпано назву міста. Прочитай. # quiz:alpha_final_1
{ quiz_ok:
    { not practice:
        ~ alpha_score += 1
    }
    Вінниця! Туди й їде автобус.
- else:
    Тут написано «Вінниця».
}
~ alpha_special = true
Абетка пройдена. Зупинка внизу стежки. # flag:glade_wall_read
-> END
