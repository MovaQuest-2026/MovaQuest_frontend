INCLUDE _variables.ink
{ has_umbrella or has_drawing:
    The rain is stopping. Off you go, and don't lose the umbrella, «парасолька»! # speaker:npc_galyna
    -> END
}
Oh, you're soaked! Come in out of the rain. «Чаю хочеш?» Want some tea? # speaker:npc_galyna
* [Так, дякую! (Yes, thank you!)]
    ~ polite = true
    Here, raspberry tea. «Звідки ти?» Where are you from?
* [Чай. Давайте. (Tea. Give it.)]
    Well... here's tea. «Звідки ти?» Where are you from?
-
* [Я тут уперше. Їду до фонтану. (It's my first time here. I'm going to the fountain.)]
    The Roshen fountain? Lovely! There's a show in the evening.
* [Здалеку. (From far away.)]
    From far away? Then all the more welcome.
- This is Vyshenka, a quiet residential district with lots of green. My kids grew up here.
More tea? # quiz:vysh_polite_1
{ quiz_ok or polite:
    Such a polite guest! Take an umbrella, «парасолька», I have three. # give:umbrella
    ~ has_umbrella = true
    ~ trust += 1
- else:
    All right. The rain will pass soon.
}
The rain is over. The trolleybus stop is just around the corner. # clock:12:00
-> END
