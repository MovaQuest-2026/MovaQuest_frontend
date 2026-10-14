INCLUDE _variables.ink
First time in Vinnytsia? You keep looking around. # speaker:npc_passenger
* [Так, перший раз. (Yes, first time.)]
    Look out of the window then. See the tram, «трамвай»? Our trams used to run in Switzerland.
* [Так. А куди ми їдемо? (Yes. Where are we going?)]
    Downtown, to Soborna, our main street, «головна вулиця».
- Oh, an announcement, listen!
«Увага! Наступна зупинка: Центральний парк.» You need Soborna. What do you do? # quiz:trolley_stop_1
{ quiz_ok:
    Right, stay seated. Yours is the next one. And here's Soborna!
    ~ stop_ok = true
- else:
    You got off?.. No worries, you can walk to the centre through the park!
    ~ stop_ok = false
}
-> END
