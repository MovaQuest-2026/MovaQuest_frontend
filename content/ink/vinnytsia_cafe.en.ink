INCLUDE _variables.ink
{ task_dessert:
    «Смачного!» Enjoy! Say hi to Solomiia. # speaker:npc_barista
    -> END
}
Hi! «Що будеш?» What will you have? # speaker:npc_barista
* [Каву з молоком, будь ласка. (Coffee with milk, please.)]
    ~ polite = true
    One coffee with milk, «з молоком»!
* [Чорну каву без цукру. (Black coffee, no sugar.)]
    Black, «без цукру». Sure.
- And a dessert, «десерт»?
* [Мені потрібен десерт для подруги. (I need a dessert for a friend.)]
    Who's your friend? Maybe I know her. Describe her. # quiz:cafe_describe_1
    { quiz_ok:
        Solomiia! The volunteer who gives tours? Of course! She always takes the cherry strudel.
        Here you go. # give:dessert
        ~ trust += 1
    - else:
        Hm, doesn't ring a bell... Take the cherry strudel, «вишневий штрудель», everyone loves it. # give:dessert
    }
    ~ task_dessert = true
* [Ні, дякую. (No, thanks.)]
    Okay. I'm here if you change your mind.
- -> END
