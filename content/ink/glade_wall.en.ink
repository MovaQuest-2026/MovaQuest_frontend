INCLUDE _variables.ink
{ alpha_special:
    Under the old letters someone scratched «Вінниця». You can read it now. # speaker:glade_wall
    -> offer
}
-> lesson(false)

=== offer ===
Want to try the exercises again? Just for practice, the score stays. # speaker:glade_wall
* [Yes, once more. (Так, ще раз.)]
    -> lesson(true)
* [Not now. (Не зараз.)]
    -> END

=== lesson(practice) ===
Five letters are carved into the old stone: Є, Ї, Ю, Я, Ь. # speaker:glade_wall
Є is ye, as in "yes". Ї is yi, and only Ukrainian has it. Ю is yu, as in "you".
Я is ya, and on its own it's a whole word: «я» means "I".
Ь is the soft sign. It has no sound of its own, it softens the letter before it.
Which letter is also the word "I"? # quiz:alpha_special_1
{ quiz_ok:
    { not practice:
        ~ alpha_score += 1
    }
    Я. Short and proud.
- else:
    It's Я.
}
How does Ї sound? # quiz:alpha_special_2
{ quiz_ok:
    { not practice:
        ~ alpha_score += 1
    }
    Yi, as in «Україна» and «їжа», food.
- else:
    It's yi. Two dots, two sounds.
}
Under the carving someone scratched a city name. Read it. # quiz:alpha_final_1
{ quiz_ok:
    { not practice:
        ~ alpha_score += 1
    }
    Vinnytsia! That's where your bus is going.
- else:
    It says «Вінниця», Vinnytsia. В-І-Н-Н-И-Ц-Я.
}
~ alpha_special = true
All 33 letters are yours. The bus stop is down the path. # flag:glade_wall_read
-> END
