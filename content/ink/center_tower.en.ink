INCLUDE _variables.ink
{ task_show_time:
    The show is «о восьмій вечора», at eight in the evening. Don't be late! # speaker:npc_tower
    -> END
}
Welcome to the Tower, «Вежа»! It's an old water tower with a clock, «годинник», over a hundred years old. # speaker:npc_tower
- (opts)
* [Що в цій вежі? (What's in this tower?)]
    It used to store water for the city centre. Now it's a museum, «музей».
    -> opts
* [О котрій сьогодні шоу фонтану? (What time is the fountain show today?)]
    Today «о восьмій вечора». Repeat it so you don't forget! # quiz:tower_time_1
    { quiz_ok:
        Right, at eight in the evening!
        ~ trust += 1
    - else:
        No, «о восьмій вечора», eight in the evening. Write it down!
    }
    ~ task_show_time = true
- Enjoy your walk! # clock:15:00
-> END
