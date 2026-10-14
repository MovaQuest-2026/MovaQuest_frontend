INCLUDE _variables.ink
{ helped_nina:
    Thank you again, «дитино» — "my child". Eat the cherry pies while they're warm. # speaker:npc_nina
    -> END
}
«Ой лишенько!» Oh dear! Where is my bag? «Велика, жовта» — big and yellow, with honey for my granddaughter! # speaker:npc_nina
* [Show her the bag you are holding]
    Oh, what have you got there? # quiz:bus_bag_1
    { quiz_ok:
        «Так!» Yes! The big yellow bag. Mine! Thank you!
        ~ helped_nina = true
        ~ trust += 1
        Here, take some cherry pies, «пиріжки». # give:pyrizhky
    - else:
        What? No, mine is yellow and big... oh, it's right there in your hands! Be more careful.
    }
* [Вибачте, я не знаю. (Sorry, I don't know.)]
    Oh, I'll go look by the ticket office.
- -> END
