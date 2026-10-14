INCLUDE _variables.ink
{ not phone_charging:
    Hey, your phone is dead, I can see. The ticket office, «каса», is over there. Ask about a socket. # speaker:npc_guard
    -> END
}
«Куди їдеш?» Where are you heading? # speaker:npc_guard
* [На Вишеньку. Де зупинка? (To Vyshenka. Where is the stop?)]
    Leave the station and turn «ліворуч», left. The stop, «зупинка», is across the road.
    { helped_nina: I heard you gave Nina her bag back. «Молодець!» Well done. }
    Have a good day in Vinnytsia! # flag:exit_bus_station
* [Я просто дивлюся. (I'm just looking.)]
    Sure. The exit is over there when you're ready.
- -> END
