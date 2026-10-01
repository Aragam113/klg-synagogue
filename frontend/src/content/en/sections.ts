/**
 * Section texts, English. Translation of `../ru/sections.ts` — same facts, same sources
 * (see the `src:` comments there).
 */
import { SITE } from '@/config/site';

import type { SectionsContent } from '../types';

export const content: SectionsContent = {
  community: {
    hero: {
      eyebrow: 'Community',
      title: 'A home where the community lives',
      italic: 'lives',
      lead: 'Prayer and Shabbat, Torah classes, holidays, help and support — everything the New Synagogue does for the Jews of Kaliningrad and the region.',
    },
    // src: FEOR https://feor.ru/administrative-units/kaliningrad/
    intro: {
      text: 'The community runs a synagogue, holds Shabbat services and religious holidays, has men’s and women’s mikvahs, a kosher canteen, the Kollel Torah program, the STARS program and a Sunday school.',
      author: 'Federation of Jewish Communities of Russia',
      source: 'feor.ru, Kaliningrad page',
      href: 'https://feor.ru/administrative-units/kaliningrad/',
    },
    cards: [
      {
        title: 'Prayer and Shabbat',
        text: 'Prayer times, candle lighting and the end of Shabbat for every day.',
        href: '/schedule',
      },
      {
        title: 'Request a prayer',
        text: 'Mi Sheberach for health, Kaddish, yahrzeit remembrance, Yizkor.',
        href: '/prayers/misheberah',
      },
      {
        title: 'Programs and classes',
        text: 'Kollel Torah, youth programs, Sunday school for children.',
        href: '/programs',
      },
      {
        title: 'Departments and services',
        text: 'Kosher canteen, mikvah, museum and the community’s charity partners.',
        href: '/departments',
      },
      {
        title: 'Meet the rabbi',
        text: 'Book a personal meeting with the rabbi or the community leadership.',
        href: '/appointment',
      },
      {
        title: 'Ask the rabbi',
        text: 'Ask a written question about tradition, rituals and life by the Torah.',
        href: '/ask-rabbi',
      },
      {
        title: 'Need help',
        text: 'If you or your family need support — write to us.',
        href: '/help',
      },
      {
        title: 'Volunteer',
        text: 'Help at holidays, programs and in caring for the elderly.',
        href: '/volunteer',
      },
      {
        title: 'Support the community',
        text: 'A donation for synagogue life, programs and charity.',
        href: '/donate',
      },
      {
        title: 'Events and news',
        text: 'Holidays, lectures, gatherings and memorial dates.',
        href: '/events',
      },
    ],
    // src: TL-comm (10.02.2025), OF-prak (2021), gotov.org programs
    programs: [
      {
        title: 'Kollel Torah',
        when: 'For men, daily at 19:00',
        text: 'Regular Torah study. For women — the women’s Kollel led by Rebbetzin Chaya Mushka Deitch, registration required.',
        href: 'https://gotov.org/programs/kolel-tora-dlya-zhenshchin-12',
      },
      {
        title: 'STARS',
        when: 'Young adults 18–28, Thursdays at 19:00',
        text: 'Classes and meetings for young people; participants receive a monthly stipend.',
        href: 'https://web.archive.org/web/20250210132321/http://sinagoga39.tilda.ws/community',
      },
      {
        title: 'Bereshit Sunday school',
        when: 'Children 5–12, Sundays',
        text: 'Traditions, holidays, Hebrew and Jewish history through play. From the 2026/27 school year — the Bereshit program.',
        href: 'https://gotov.org/programs/bereshit-kaliningrad-2026-2027',
      },
      {
        title: 'EnerJew youth club',
        when: 'For young people',
        text: 'Meetings, trips and holidays of the community youth club.',
        href: 'https://gotov.org/news/klub-enerjew-kaliningrad-vernulsya-v-formate-aviaputeshestviya',
      },
    ],
    // src: TL-reception (17.12.2024)
    reception: [
      {
        title: 'Rabbi’s office',
        paragraphs: [
          'By appointment through the secretary. Questions of religion, Jewish wedding (chuppah), divorce, circumcision, burial, confirmation of Jewish descent, conversion.',
        ],
      },
      {
        title: 'Synagogue office',
        paragraphs: [
          'By appointment. Community life, donations, interfaith dialogue and other matters.',
        ],
      },
    ],
    // src: OF-home (17.01.2026), FEOR, GOTOV
    partners: {
      title: 'Alongside the community',
      paragraphs: [
        'The Hesed charity center cares for the elderly and those in need; the Jewish Agency (Sochnut) helps those considering aliyah and learning Hebrew.',
        'The community publishes the Simcha newspaper and looks after the Jewish section of Tsvetkovo cemetery; every January buses leave the synagogue for the March of the Living in Yantarny, in memory of the victims of the 1945 death march.',
      ],
    },
  },

  visit: {
    hero: {
      eyebrow: 'Visitors',
      title: 'Welcome to the synagogue',
      italic: 'synagogue',
      lead: 'The New Synagogue stands on the island opposite the Fish Village, on the site of the Königsberg synagogue of 1896. It houses an active prayer hall and a museum of the Jews of Königsberg.',
    },
    // src: OF-tour (16.06.2026)
    intro: {
      text: 'The Kaliningrad synagogue is not just a tourist attraction, but a living, active synagogue.',
      author: 'New Synagogue of Kaliningrad',
      source: 'Tours and information for visitors (official site, archived 16.06.2026)',
      href: 'https://web.archive.org/web/20260616081640/http://kldsynagogue.com/ekskursii-i-informatsiya-dlya-turistov/',
    },
    cards: [
      {
        title: 'Opening hours',
        text: 'When the synagogue, the museum and the kosher canteen are open.',
        href: '/visit/hours',
      },
      {
        title: 'Getting here',
        text: 'Address, stops, map and landmarks.',
        href: '/visit/how-to-get',
      },
      {
        title: 'Visitor rules',
        text: 'Dress, conduct, photography, Shabbat and holidays.',
        href: '/visit/rules',
      },
      {
        title: 'Tours',
        text: 'The prayer hall, private tours, prices and discounts.',
        href: '/visit/excursions',
      },
      {
        title: 'New Synagogue Museum',
        text: 'A permanent exhibition on the history of Jewish Königsberg.',
        href: '/visit/museum',
      },
      {
        title: 'Kosher food',
        text: 'The kosher canteen in the synagogue building.',
        href: '/visit/kosher',
      },
      {
        title: 'History of the synagogue',
        text: 'From the consecration in 1896 to the revival in 2018.',
        href: '/history',
      },
    ],
    hours: {
      hero: {
        eyebrow: 'Visitors',
        title: 'Opening hours',
        italic: 'hours',
        lead: 'The synagogue welcomes guests every day except Saturday. There are no tours on Shabbat and Jewish holidays.',
      },
      synagogue: {
        title: 'Synagogue (prayer hall)',
        paragraphs: [
          'The synagogue can be visited every day except Saturday, only as part of a guided tour. At the listed times a tour starts regardless of the number of guests.',
        ],
      },
      museum: {
        title: 'New Synagogue Museum',
        paragraphs: [
          'The museum is on the second floor. Closed on Saturday; Friday hours depend on the season.',
        ],
      },
      kosher: {
        title: 'Kosher canteen',
        paragraphs: ['Closed on Saturday. Meals for tourist groups can be arranged in advance.'],
      },
    },
    howTo: {
      hero: {
        eyebrow: 'Visitors',
        title: 'Getting here',
        italic: 'here',
        lead: 'The synagogue is in the city center, on the Pregolya embankment, a few minutes’ walk from Kant Island.',
      },
      landmarks: {
        title: 'Landmarks',
        paragraphs: [
          'Opposite the Fish Village; across the river — Kant Island and the Cathedral, the Honey Bridge nearby.',
          'Next door is the former Jewish orphanage (3 Oktyabrskaya St.). The museum is on the second floor, the prayer hall on the third.',
        ],
      },
      accessibility: {
        title: 'Accessibility',
        paragraphs: [
          'The building has a lift, wheelchair access, an accessible toilet and bicycle parking. Animals are not allowed in the museum.',
        ],
      },
      nearby: [
        {
          title: 'Fish Village',
          text: 'An embankment with restaurants and the Lighthouse viewing tower — right across from the synagogue.',
        },
        {
          title: 'Kant Island',
          text: 'The Cathedral and Immanuel Kant’s tomb — across the Honey Bridge.',
        },
        {
          title: 'The 1904 orphanage',
          text: 'The former Jewish orphanage, a heritage site, 3 Oktyabrskaya St.',
        },
        {
          title: 'Royal Gate cemetery',
          text: 'The Jewish cemetery of 1875 where Rabbi Israel Salanter is buried (Gagarina St. and Litovsky Val).',
        },
      ],
    },
    rules: {
      hero: {
        eyebrow: 'Visitors',
        title: 'Visitor rules',
        italic: 'rules',
        lead: 'The synagogue is an active house of prayer. A few simple rules will help you feel confident and respect the community.',
      },
      items: [
        {
          title: 'Dress',
          text: 'Shoulders and knees covered. Men customarily cover their heads — with a kippah, hat or cap.',
        },
        {
          title: 'Conduct',
          text: 'Speak quietly in the prayer hall and do not disturb worshippers. Men and women pray separately.',
        },
        {
          title: 'Photo and video',
          text: 'Ask your guide before taking pictures. Do not photograph worshippers without their consent.',
        },
        {
          title: 'Food and animals',
          text: 'Do not bring non-kosher food into the synagogue. Animals are not allowed in the museum.',
        },
      ],
      shabbat: {
        title: 'Shabbat and holidays',
        paragraphs: [
          'Shabbat begins on Friday evening with candle lighting and ends on Saturday after nightfall. On Saturday the synagogue and the museum are closed to visitors.',
          'There are no tours on Jewish holidays (Yom Tov) either. Candle lighting times and holiday dates are in the schedule.',
        ],
      },
    },
    excursions: {
      hero: {
        eyebrow: 'Visitors',
        title: 'Tours of the synagogue',
        italic: 'synagogue',
        lead: 'The prayer hall can be visited only with a tour. Tours start every hour; book a private tour in advance.',
      },
      kinds: [
        {
          title: 'Prayer hall tour',
          text: 'A scheduled group tour: the history of the building, how a synagogue works, community traditions.',
        },
        {
          title: 'Private tour',
          text: 'For your group at a convenient time — on request through the tour office.',
        },
        {
          title: 'Museum + prayer hall',
          text: 'A combined ticket: the museum’s permanent exhibition and a synagogue tour.',
        },
        {
          title: 'Walking tour',
          text: '“Traces of history around Kneiphof” — a walk through the Jewish sites of the city center.',
        },
      ],
      rules: [
        'Tours run every day except Saturday and Jewish holidays.',
        'Request a private tour at least 3 days in advance.',
        'Discount coupons are available at city tour agencies and from accredited guides.',
        'Museum tours can be booked in Russian, German and English.',
      ],
      free: ['Children under 12', 'Citizens over 80', 'WWII veterans'],
    },
    museum: {
      hero: {
        eyebrow: 'Visitors',
        title: 'New Synagogue Museum',
        italic: 'Museum',
        lead: 'A permanent exhibition on the history and culture of Jewish Königsberg on the second floor of the synagogue. The museum opened on 18 September 2022.',
      },
      about: {
        title: 'About the museum',
        paragraphs: [
          'The museum is curated by the Berlin association Jews in East Prussia (Juden in Ostpreussen e.V.), curator Prof. Ruth Leiserowitz. The exhibition was designed in Germany with the support of the German Federal Foreign Office.',
          'A light wheel lets visitors choose people’s stories and the language — Russian, English, German or Hebrew.',
        ],
      },
      halls: [
        {
          title: 'Arrival',
          text: 'Seven biographies of Lithuanian, Polish and Russian Jews who came to Königsberg.',
        },
        {
          title: 'Staying',
          text: 'Königsberg through the eyes of its Jewish residents — work, study, family, faith.',
        },
        {
          title: 'Expulsion',
          text: 'Memories of pupils of the Jewish school at the synagogue, 1935–1942.',
        },
        {
          title: 'Annihilation',
          text: 'Three angular “islands” in the hall — on the Holocaust of the Jews of East Prussia.',
        },
      ],
      exhibitions: {
        title: 'Temporary exhibitions',
        paragraphs: [
          '“Farewell to Königsberg” (2023), “Architect Josef Klarwein” (2024), the traveling exhibition “Holocaust: Annihilation, Resistance, Rescue” (2024).',
        ],
      },
    },
    kosher: {
      hero: {
        eyebrow: 'Visitors',
        title: 'Kosher food',
        italic: 'food',
        lead: 'The kosher canteen has been open in the synagogue building since 29 May 2019.',
      },
      about: {
        title: 'Kosher canteen',
        paragraphs: [
          'The menu offers Jewish and familiar European dishes: salads, soups, main courses, pastries, pita, forshmak, falafel.',
          'Kashrut is the body of Jewish dietary law: meat and dairy are never mixed, meat comes only from permitted animals slaughtered properly. In the kosher canteen the community supervises this.',
        ],
      },
      groups: {
        title: 'For groups',
        paragraphs: ['Meals for tourist groups can be arranged in advance by calling the canteen.'],
      },
    },
  },

  history: {
    hero: {
      eyebrow: 'History',
      title: 'A synagogue returned to its place',
      italic: 'place',
      lead: 'In 1896 the New Synagogue of Königsberg was consecrated on Lindenstrasse. In 1938 the Nazis burned it. Eighty years later, in November 2018, a new synagogue opened on the same site.',
    },
    chapters: [
      {
        id: 'koenigsberg',
        year: '1894–1896',
        title: 'Königsberg and the New Synagogue',
        italic: 'New',
        paragraphs: [
          'It was built in 1894–1896 to the design of the Berlin architects Cremer and Wolffenstein, which won an open competition of 33 entries. The synagogue was consecrated on 25 August 1896.',
          'The site on a wide embankment opposite the Cathedral overlooked the Pregolya, the Honey Bridge and the nearby quays. The building stood on oak piles 12–13 meters long.',
          'For the opening the community’s chief cantor Eduard Birnbaum wrote “Se’u She’arim” — “Lift up your heads, O gates”.',
        ],
        photos: ['k1900', 'honeyBridge'],
        quote: {
          text: 'The domed tower of the New Synagogue echoed the forms of the Christian cathedral standing on the opposite bank.',
          author: 'The synagogue’s former official website',
          source: '“Why we build the synagogue on this site” (archived 2019)',
          href: 'https://web.archive.org/web/20190721134702/https://kldsynagogue.com/en/pages/pocemu-my-stroim-sinagogu-na-etom-meste',
        },
      },
      {
        id: 'architecture',
        year: '46 m',
        title: 'Architecture',
        italic: 'Architecture',
        paragraphs: [
          'Built of dark red brick with green glass windows, the synagogue rose 46 meters and adorned the city.',
          'The iron dome, 10 meters high and 13.1 meters across, had 16 sides and was covered with red-brown glazed tiles; the spire was crowned with a gilded Shield of David.',
          'The hall seated 712 men (760 with the vestibule) and 600 women in the galleries.',
        ],
        photos: ['k1925', 'interior1896'],
      },
      {
        id: 'kristallnacht',
        year: '1938',
        title: 'Kristallnacht',
        italic: 'Kristallnacht',
        paragraphs: [
          'On the night of 9–10 November 1938 the synagogue was burned. Its furnishings and the community’s philosophical library were lost, and the neighboring Jewish orphanage of 1904 was damaged — the children were driven out into the street that night.',
        ],
        photos: [],
        quote: {
          text: 'Once the Königsberg synagogue stood on this site; it was burned on the night of 9 to 10 November 1938.',
          author: 'Alexander Boroda, President of the FJC of Russia',
          source: 'RIA Novosti, 08.11.2018',
          href: 'https://ria.ru/20181108/1532400404.html',
        },
      },
      {
        id: 'fate',
        year: '1935–1945',
        title: 'The fate of the community',
        italic: 'community',
        paragraphs: [
          'In 1933, 3,170 Jews lived in Königsberg; by 1939 just over one and a half thousand remained. From 1935 to 1942 a Jewish school operated at the synagogue.',
          'On 24 June 1942 a deportation train left Königsberg for Minsk. On the synagogue site the Nazis built barracks for Jewish forced laborers; in August 1944 British bombing completed the destruction.',
        ],
        photos: [],
      },
      {
        id: 'revival',
        year: '1989–2018',
        title: 'Revival',
        italic: 'Revival',
        paragraphs: [
          'In 1989 Matvey Gurants, Viktor Shapiro and Iosif Kleiner founded the Society of Jewish History and Culture. Since 1998 the religious organization “Jewish Community of Kaliningrad”, led by Rabbi David Shvedik, has been active.',
          'In 2011 the city gave the community a plot on Oktyabrskaya Street, the Synagogue Construction Foundation was set up, and in October the first stone was laid. Vladimir Katsman became the main patron.',
          'Architect Natalia Lorens: “This is a revival, not a restoration.” The new building keeps the proportions and configuration of the historic one but is clad in light beige marble and terracotta. On 19 February 2018 the 23-ton dome was raised, on 20 May the spire with the Star of David; the dome’s stained glass follows motifs of Marc Chagall.',
        ],
        photos: ['stone2012', 'site2016', 'build2017'],
        quote: {
          text: 'We kept the proportions and repeated the configuration of the building.',
          author: 'Natalia Kopychina-Lorens, architect',
          source: 'Kaliningrad.Ru, February 2018',
          href: 'https://kgd.ru/news/society/item/70780-kupol-i-shagal-na-vitrazhah-kak-gotovyatsya-k-otkrytiyu-sinagogi-v-kaliningrade',
        },
      },
      {
        id: 'opening',
        year: '2018',
        title: 'Opening on 8 November 2018',
        italic: '2018',
        paragraphs: [
          'The synagogue opened on 8 November 2018, marking 80 years since Kristallnacht. About 1,200 people attended; a Torah scroll was brought in. Guests included Chief Rabbi of Russia Berel Lazar, FJC President Alexander Boroda, the ambassadors of Germany and Israel, and Kristallnacht witness Nechama Drober.',
        ],
        photos: ['eve2018'],
        quote: {
          text: 'That it has been rebuilt shows that the people of Israel are alive and the Nazis did not achieve their goal.',
          author: 'David Shvedik, Chief Rabbi of Kaliningrad',
          source: 'Radio Svoboda',
          href: 'https://www.svoboda.org/a/29596726.html',
        },
      },
      {
        id: 'today',
        year: '2026',
        title: 'Today',
        italic: 'Today',
        paragraphs: [
          'In 2019 the first chuppah took place in the synagogue and the kosher canteen opened. On 18 September 2022 the New Synagogue Museum opened on the second floor.',
          'On 31 August 2026 the community celebrated 130 years since the consecration of the synagogue.',
        ],
        photos: ['facade2019', 'nightRiver'],
        quote: {
          text: 'A magnificent mikvah, a youth club that ensures continuity of generations, a kosher restaurant and a museum that carefully preserves the heritage — all this makes the synagogue a beacon of light, mercy and holiness.',
          author: 'Berel Lazar, Chief Rabbi of Russia',
          source: 'gotov.org, for the synagogue’s 130th anniversary',
          href: 'https://gotov.org/news/kaliningradskaya-sinagoga-otprazdnovala-130-letniy-yubiley',
        },
      },
    ],
    timeline: [
      { date: '1894', text: 'Foundation stone laid (24 May, per the State Archive)' },
      { date: '25.08.1896', text: 'Consecration of the New Synagogue on Lindenstrasse' },
      { date: '10.11.1938', text: 'The synagogue burned on Kristallnacht' },
      { date: '1944', text: 'Final destruction in the bombing' },
      { date: '1989', text: 'Society of Jewish History and Culture' },
      { date: '1998', text: 'Jewish Community of Kaliningrad' },
      { date: '2011', text: 'Plot on Oktyabrskaya St., first stone' },
      { date: '19.02.2018', text: 'The dome is raised' },
      { date: '08.11.2018', text: 'The synagogue opens' },
      { date: '18.09.2022', text: 'New Synagogue Museum opens' },
      { date: '31.08.2026', text: '130 years of the synagogue' },
    ],
  },

  about: {
    hero: {
      eyebrow: 'About',
      title: 'The people of the community',
      italic: 'community',
      lead: 'Rabbis, leadership and trustees of the Jewish Community of Kaliningrad.',
    },
    intro: {
      title: 'Jewish Community of Kaliningrad',
      paragraphs: [
        'The Jewish religious organization has been active since 1998 and is part of the Federation of Jewish Communities of Russia. The community gathers at the New Synagogue on Oktyabrskaya Street.',
      ],
    },
    people: [
      {
        name: SITE.people.rabbi.value.en,
        role: 'Chief Rabbi of Kaliningrad and the Kaliningrad Region',
        note: 'Representative of the Chief Rabbinate of Russia; has led the community since 1998.',
        href: 'https://gotov.org/organizations/evreyskaya-obshchina-kaliningrada',
      },
      {
        name: SITE.people.rabbiDeitch.value.en,
        role: 'Rabbi',
        note: 'Emissary of the Lubavitcher Rebbe, in Kaliningrad since 2020.',
        href: 'https://gotov.org/organizations/evreyskaya-obshchina-kaliningrada',
      },
      {
        name: SITE.people.rebbetzin.value.en,
        role: 'Rebbetzin',
        note: 'Leads the women’s Kollel Torah.',
        href: 'https://gotov.org/programs/kolel-tora-dlya-zhenshchin-12',
      },
      {
        name: SITE.people.chairman.value.en,
        role: 'Chairman of the Jewish Community of Kaliningrad',
        note: 'Chairman of the Jewish religious organization.',
        href: 'https://gotov.org/organizations/evreyskaya-obshchina-kaliningrada',
      },
      {
        name: SITE.people.trustees.value.en,
        role: 'Chairman of the Board of Trustees',
        note: 'The main patron of the synagogue’s construction.',
        href: 'https://gotov.org/organizations/evreyskaya-obshchina-kaliningrada',
      },
      {
        name: SITE.people.museumCurator.value.en,
        role: 'Curator of the New Synagogue Museum',
        note: 'Jews in East Prussia association, Berlin.',
        href: 'https://jmkaliningrad.org/%d0%ba%d0%be%d0%bd%d1%82%d0%b0%d0%ba%d1%82%d1%8b/',
      },
    ],
    trust: {
      title: 'Built by many hands',
      paragraphs: [
        'The synagogue doors were paid for by veteran and former Warsaw Ghetto prisoner Yakov Sukhovolsky. The library was donated by the Euro-Asian Jewish Congress.',
      ],
    },
  },

  contacts: {
    hero: {
      eyebrow: 'Contacts',
      title: 'How to reach us',
      italic: 'reach',
      lead: 'Phone numbers of the community, the tour office, the museum and the kosher canteen. They were published in different years — if one does not answer, try another.',
    },
    note: 'The former official site kldsynagogue.com no longer works (the domain expired) — current contacts are collected on this page.',
  },

  legal: {
    privacy: {
      title: 'Privacy policy',
      updated: 'Version of 01.10.2026',
      sections: [
        {
          title: '1. Who processes the data',
          paragraphs: [
            'Personal data operator: [ВПИШИ: наименование организации, ИНН, ОГРН, адрес]. This policy applies to all pages and forms of this site.',
          ],
        },
        {
          title: '2. What data we receive',
          paragraphs: [
            'Only what you enter in the forms yourself: name, phone, e-mail, date and content of the request (prayer request, tour or appointment booking, question to the rabbi, request for help, volunteering, event registration, donation, subscription).',
            'Technical data: cookies for the language choice and the banner consent. No third-party analytics are installed.',
          ],
        },
        {
          title: '3. Why',
          paragraphs: [
            'To answer your request, contact you, process a payment and issue a receipt, remind you of a yahrzeit (if you asked for it).',
          ],
        },
        {
          title: '4. Legal basis',
          paragraphs: [
            'Consent of the data subject (Art. 6(1)(1) of Russian Federal Law No. 152-FZ “On Personal Data”), and for payments — performance of the donation agreement.',
          ],
        },
        {
          title: '5. Storage and transfer',
          paragraphs: [
            'Data is stored on servers in the Russian Federation no longer than necessary for the purposes of processing, or until consent is withdrawn. It is not transferred to third parties, except the payment operator when you pay.',
          ],
        },
        {
          title: '6. Your rights',
          paragraphs: [
            'You may find out what data about you is stored, correct it, request deletion and withdraw consent by writing to the operator: [ВПИШИ: e-mail для запросов по персональным данным].',
          ],
        },
      ],
    },
    consent: {
      title: 'Consent to personal data processing',
      updated: 'Version of 01.10.2026',
      sections: [
        {
          title: 'To whom consent is given',
          paragraphs: [
            'By ticking the box in a form on this site, I consent to the operator [ВПИШИ: наименование организации, ИНН, адрес] processing my personal data.',
          ],
        },
        {
          title: 'What data',
          paragraphs: [
            'Surname, name, phone number, e-mail address and the information I entered in the form myself.',
          ],
        },
        {
          title: 'Purposes and actions',
          paragraphs: [
            'Handling the request and contacting me. Collection, recording, organization, storage, clarification, use, deletion and destruction — with or without automation.',
          ],
        },
        {
          title: 'Term and withdrawal',
          paragraphs: [
            'Consent is valid until the purposes of processing are achieved or until it is withdrawn. Consent can be withdrawn by a written request to the operator at [ВПИШИ: e-mail или почтовый адрес оператора].',
          ],
        },
      ],
    },
  },
};
