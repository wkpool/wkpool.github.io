-- WK 2026 Groepsfase - alle 72 wedstrijden
-- Tijden opgeslagen in UTC (Nederlandse zomertijd / CEST = UTC+2)
-- Uitvoeren in Supabase SQL Editor

INSERT INTO public.matches (home, away, date) VALUES

-- Groep A
('Mexico',       'Zuid-Afrika',  '2026-06-11 19:00:00'),
('Zuid-Korea',   'Tsjechië',     '2026-06-12 02:00:00'),
('Tsjechië',     'Zuid-Afrika',  '2026-06-18 16:00:00'),
('Mexico',       'Zuid-Korea',   '2026-06-19 01:00:00'),
('Tsjechië',     'Mexico',       '2026-06-25 01:00:00'),
('Zuid-Afrika',  'Zuid-Korea',   '2026-06-25 01:00:00'),

-- Groep B
('Canada',             'Bosnië-Herzegovina', '2026-06-12 19:00:00'),
('Qatar',              'Zwitserland',         '2026-06-13 19:00:00'),
('Zwitserland',        'Bosnië-Herzegovina', '2026-06-18 19:00:00'),
('Canada',             'Qatar',              '2026-06-18 22:00:00'),
('Zwitserland',        'Canada',             '2026-06-24 19:00:00'),
('Bosnië-Herzegovina', 'Qatar',              '2026-06-24 19:00:00'),

-- Groep C
('Brazilië', 'Marokko',  '2026-06-13 22:00:00'),
('Haïti',    'Schotland', '2026-06-14 01:00:00'),
('Schotland', 'Marokko', '2026-06-19 22:00:00'),
('Brazilië', 'Haïti',    '2026-06-20 00:30:00'),
('Schotland', 'Brazilië', '2026-06-24 22:00:00'),
('Marokko',  'Haïti',    '2026-06-24 22:00:00'),

-- Groep D
('Verenigde Staten', 'Paraguay',          '2026-06-13 01:00:00'),
('Australië',        'Turkije',           '2026-06-14 04:00:00'),
('Verenigde Staten', 'Australië',         '2026-06-19 19:00:00'),
('Turkije',          'Paraguay',          '2026-06-20 03:00:00'),
('Turkije',          'Verenigde Staten',  '2026-06-26 02:00:00'),
('Paraguay',         'Australië',         '2026-06-26 02:00:00'),

-- Groep E
('Duitsland',   'Curaçao',   '2026-06-14 17:00:00'),
('Ivoorkust',   'Ecuador',   '2026-06-14 23:00:00'),
('Duitsland',   'Ivoorkust', '2026-06-20 20:00:00'),
('Ecuador',     'Curaçao',   '2026-06-21 00:00:00'),
('Curaçao',     'Ivoorkust', '2026-06-25 20:00:00'),
('Ecuador',     'Duitsland', '2026-06-25 20:00:00'),

-- Groep F
('Nederland', 'Japan',    '2026-06-14 20:00:00'),
('Zweden',    'Tunesië',  '2026-06-15 02:00:00'),
('Nederland', 'Zweden',   '2026-06-20 17:00:00'),
('Tunesië',   'Japan',    '2026-06-21 04:00:00'),
('Japan',     'Zweden',   '2026-06-25 23:00:00'),
('Tunesië',   'Nederland','2026-06-25 23:00:00'),

-- Groep G
('Iran',        'Nieuw-Zeeland', '2026-06-16 01:00:00'),
('België',      'Egypte',        '2026-06-16 19:00:00'),
('België',      'Iran',          '2026-06-21 19:00:00'),
('Nieuw-Zeeland','Egypte',       '2026-06-22 01:00:00'),
('Egypte',      'Iran',          '2026-06-27 03:00:00'),
('Nieuw-Zeeland','België',       '2026-06-27 03:00:00'),

-- Groep H
('Spanje',        'Kaapverdië',    '2026-06-15 16:00:00'),
('Saoedi-Arabië', 'Uruguay',       '2026-06-15 22:00:00'),
('Spanje',        'Saoedi-Arabië', '2026-06-21 16:00:00'),
('Uruguay',       'Kaapverdië',    '2026-06-21 22:00:00'),
('Kaapverdië',    'Saoedi-Arabië', '2026-06-27 00:00:00'),
('Uruguay',       'Spanje',        '2026-06-27 00:00:00'),

-- Groep I
('Frankrijk', 'Senegal',  '2026-06-16 19:00:00'),
('Irak',      'Noorwegen', '2026-06-16 22:00:00'),
('Frankrijk', 'Irak',     '2026-06-22 21:00:00'),
('Noorwegen', 'Senegal',  '2026-06-23 00:00:00'),
('Noorwegen', 'Frankrijk','2026-06-26 19:00:00'),
('Senegal',   'Irak',     '2026-06-26 19:00:00'),

-- Groep J
('Argentinië', 'Algerije',   '2026-06-17 01:00:00'),
('Oostenrijk', 'Jordanië',   '2026-06-17 04:00:00'),
('Argentinië', 'Oostenrijk', '2026-06-22 17:00:00'),
('Jordanië',   'Algerije',   '2026-06-23 03:00:00'),
('Algerije',   'Oostenrijk', '2026-06-28 02:00:00'),
('Jordanië',   'Argentinië', '2026-06-28 02:00:00'),

-- Groep K
('Portugal',    'Congo',        '2026-06-17 17:00:00'),
('Oezbekistan', 'Colombia',     '2026-06-18 02:00:00'),
('Portugal',    'Oezbekistan',  '2026-06-23 17:00:00'),
('Colombia',    'Congo',        '2026-06-24 02:00:00'),
('Colombia',    'Portugal',     '2026-06-27 23:30:00'),
('Congo',       'Oezbekistan',  '2026-06-27 23:30:00'),

-- Groep L
('Engeland',  'Kroatië', '2026-06-17 20:00:00'),
('Ghana',     'Panama',  '2026-06-17 23:00:00'),
('Engeland',  'Ghana',   '2026-06-23 20:00:00'),
('Panama',    'Kroatië', '2026-06-23 23:00:00'),
('Panama',    'Engeland','2026-06-27 21:00:00'),
('Kroatië',   'Ghana',   '2026-06-27 21:00:00');
