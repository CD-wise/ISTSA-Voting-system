-- Insert voting categories
INSERT INTO voting_categories (name, display_order) VALUES
('Presidential', 1),
('Vice President', 2),
('Financial Secretary', 3),
('General Secretary', 4),
('General Organizers', 5),
('WOCOM', 6),
('PRO', 7),
('Part-time Representative', 8);

-- Insert comprehensive sample student IDs for testing
-- Format: YYXXXNNNL where YY=year, XXX=program code, NNN=sequence, L=level indicator
INSERT INTO students (student_id) VALUES
-- Information Systems & Technology (CS = 200)
('22200001d'), -- 2022 intake, CS, student 001, level indicator d
('22200002d'),
('22200003d'),
('22200004d'),
('22200005d'),
('21200010c'), -- 2021 intake, CS, student 010, level indicator c
('21200011c'),
('21200012c'),
('21200013c'),
('21200014c'),
('20200020b'), -- 2020 intake, CS, student 020, level indicator b
('20200021b'),
('20200022b'),
('20200023b'),
('20200024b'),
('19200030a'), -- 2019 intake, CS, student 030, level indicator a
('19200031a'),
('19200032a'),
('19200033a'),
('19200034a'),

-- Information Technology Students (IT = 300)
('22300001d'), -- 2022 intake, IT
('22300002d'),
('22300003d'),
('21300010c'), -- 2021 intake, IT
('21300011c'),
('21300012c'),
('20300020b'), -- 2020 intake, IT
('20300021b'),
('20300022b'),
('19300030a'), -- 2019 intake, IT
('19300031a'),
('19300032a'),

-- Cybersecurity Students (CY = 400)
('22400001d'), -- 2022 intake, Cybersecurity
('22400002d'),
('22400003d'),
('21400010c'), -- 2021 intake, Cybersecurity
('21400011c'),
('21400012c'),
('20400020b'), -- 2020 intake, Cybersecurity
('20400021b'),
('20400022b'),
('19400030a'), -- 2019 intake, Cybersecurity
('19400031a'),
('19400032a'),

-- Additional mixed samples for comprehensive testing
('23200001d'), -- 2023 fresh students
('23200002d'),
('23300001d'),
('23400001d'),
('18200040a'), -- 2018 final year students
('18300040a'),
('18400040a');

-- Insert sample candidates with better images
INSERT INTO candidates (name, category_id, photo_url) VALUES
-- Presidential candidates
('Alice Brown', 1, '/placeholder.svg?height=400&width=400&text=Alice+Brown'),
('Bob Davis', 1, '/placeholder.svg?height=400&width=400&text=Bob+Davis'),
('Charlie Wilson', 1, '/placeholder.svg?height=400&width=400&text=Charlie+Wilson'),

-- Vice President candidates
('Diana Smith', 2, '/placeholder.svg?height=400&width=400&text=Diana+Smith'),
('Edward Johnson', 2, '/placeholder.svg?height=400&width=400&text=Edward+Johnson'),

-- Financial Secretary candidates
('Fiona Taylor', 3, '/placeholder.svg?height=400&width=400&text=Fiona+Taylor'),
('George Miller', 3, '/placeholder.svg?height=400&width=400&text=George+Miller'),
('Hannah Lee', 3, '/placeholder.svg?height=400&width=400&text=Hannah+Lee'),

-- General Secretary candidates
('Isaac Clark', 4, '/placeholder.svg?height=400&width=400&text=Isaac+Clark'),
('Julia Rodriguez', 4, '/placeholder.svg?height=400&width=400&text=Julia+Rodriguez'),

-- General Organizers candidates
('Kevin Thompson', 5, '/placeholder.svg?height=400&width=400&text=Kevin+Thompson'),
('Linda Martinez', 5, '/placeholder.svg?height=400&width=400&text=Linda+Martinez'),
('Michael Anderson', 5, '/placeholder.svg?height=400&width=400&text=Michael+Anderson'),

-- WOCOM candidates
('Nancy Garcia', 6, '/placeholder.svg?height=400&width=400&text=Nancy+Garcia'),
('Oliver Moore', 6, '/placeholder.svg?height=400&width=400&text=Oliver+Moore'),

-- PRO candidates
('Patricia Jackson', 7, '/placeholder.svg?height=400&width=400&text=Patricia+Jackson'),
('Quincy White', 7, '/placeholder.svg?height=400&width=400&text=Quincy+White'),
('Rachel Green', 7, '/placeholder.svg?height=400&width=400&text=Rachel+Green'),

-- Part-time Representative candidates
('Samuel Brown', 8, '/placeholder.svg?height=400&width=400&text=Samuel+Brown'),
('Tina Davis', 8, '/placeholder.svg?height=400&width=400&text=Tina+Davis');
