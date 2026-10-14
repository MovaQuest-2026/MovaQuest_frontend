INCLUDE _variables.ink
{ task_flowers:
    Have a nice day! Grandma will be happy. # speaker:npc_florist
    -> END
}
«Добрий день!» Good afternoon! What flowers, «квіти», are you looking for? # speaker:npc_florist
* [Мені потрібні квіти для бабусі. (I need flowers for a grandma.)]
    Daisies, «ромашки», are lovely for a grandma. They cost «сто двадцять гривень», roses cost «двісті».
    So how much are the daisies? # quiz:vysh_price_1
    { quiz_ok:
        Yes, 120. You give me 200, here's 80 change, «решта».
        ~ trust += 1
    - else:
        No, «сто двадцять», 120. Numbers are hard! Here's your change.
    }
    Here are your daisies. # give:flowers
    ~ task_flowers = true
    Oh, looks like rain, «дощ». Find some shelter! # clock:11:15
* [Я просто дивлюся. (I'm just looking.)]
    Go ahead.
- -> END
