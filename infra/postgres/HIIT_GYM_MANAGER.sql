PGDMP  -                    }            HIIT_GYM_MANAGER    17.5    17.5 =    H           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                           false            I           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                           false            J           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                           false            K           1262    16956    HIIT_GYM_MANAGER    DATABASE     �   CREATE DATABASE "HIIT_GYM_MANAGER" WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'English_South Africa.1252';
 "   DROP DATABASE "HIIT_GYM_MANAGER";
                     postgres    false            c           1247    16988    membership_status    TYPE     r   CREATE TYPE public.membership_status AS ENUM (
    'pending',
    'approved',
    'suspended',
    'cancelled'
);
 $   DROP TYPE public.membership_status;
       public               postgres    false            ]           1247    16969 	   user_role    TYPE     `   CREATE TYPE public.user_role AS ENUM (
    'member',
    'coach',
    'admin',
    'manager'
);
    DROP TYPE public.user_role;
       public               postgres    false            �            1259    17021    admins    TABLE     U   CREATE TABLE public.admins (
    user_id integer NOT NULL,
    authorisation text
);
    DROP TABLE public.admins;
       public         heap r       postgres    false            �            1259    17076    classbookings    TABLE     �   CREATE TABLE public.classbookings (
    booking_id integer NOT NULL,
    class_id integer,
    member_id integer,
    booked_at timestamp without time zone DEFAULT now()
);
 !   DROP TABLE public.classbookings;
       public         heap r       postgres    false            �            1259    17075    classbookings_booking_id_seq    SEQUENCE     �   CREATE SEQUENCE public.classbookings_booking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 3   DROP SEQUENCE public.classbookings_booking_id_seq;
       public               postgres    false    229            L           0    0    classbookings_booking_id_seq    SEQUENCE OWNED BY     ]   ALTER SEQUENCE public.classbookings_booking_id_seq OWNED BY public.classbookings.booking_id;
          public               postgres    false    228            �            1259    17053    classes    TABLE     [  CREATE TABLE public.classes (
    class_id integer NOT NULL,
    capacity integer NOT NULL,
    scheduled_date date NOT NULL,
    scheduled_time time without time zone NOT NULL,
    duration_minutes integer NOT NULL,
    coach_id integer,
    workout_id integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT now()
);
    DROP TABLE public.classes;
       public         heap r       postgres    false            �            1259    17052    classes_class_id_seq    SEQUENCE     �   CREATE SEQUENCE public.classes_class_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 +   DROP SEQUENCE public.classes_class_id_seq;
       public               postgres    false    227            M           0    0    classes_class_id_seq    SEQUENCE OWNED BY     M   ALTER SEQUENCE public.classes_class_id_seq OWNED BY public.classes.class_id;
          public               postgres    false    226            �            1259    17009    coaches    TABLE     L   CREATE TABLE public.coaches (
    user_id integer NOT NULL,
    bio text
);
    DROP TABLE public.coaches;
       public         heap r       postgres    false            �            1259    17033    managers    TABLE     ?   CREATE TABLE public.managers (
    user_id integer NOT NULL
);
    DROP TABLE public.managers;
       public         heap r       postgres    false            �            1259    16997    members    TABLE     �   CREATE TABLE public.members (
    user_id integer NOT NULL,
    status public.membership_status DEFAULT 'pending'::public.membership_status NOT NULL,
    credits_balance integer DEFAULT 0 NOT NULL
);
    DROP TABLE public.members;
       public         heap r       postgres    false    867    867            �            1259    16977 	   userroles    TABLE     i   CREATE TABLE public.userroles (
    user_id integer NOT NULL,
    user_role public.user_role NOT NULL
);
    DROP TABLE public.userroles;
       public         heap r       postgres    false    861            �            1259    16958    users    TABLE     �   CREATE TABLE public.users (
    user_id integer NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    password_hash text NOT NULL
);
    DROP TABLE public.users;
       public         heap r       postgres    false            �            1259    16957    users_user_id_seq    SEQUENCE     �   CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 (   DROP SEQUENCE public.users_user_id_seq;
       public               postgres    false    218            N           0    0    users_user_id_seq    SEQUENCE OWNED BY     G   ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;
          public               postgres    false    217            �            1259    17044    workouts    TABLE     �   CREATE TABLE public.workouts (
    workout_id integer NOT NULL,
    workout_name character varying(255) NOT NULL,
    workout_content text NOT NULL
);
    DROP TABLE public.workouts;
       public         heap r       postgres    false            �            1259    17043    workouts_workout_id_seq    SEQUENCE     �   CREATE SEQUENCE public.workouts_workout_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 .   DROP SEQUENCE public.workouts_workout_id_seq;
       public               postgres    false    225            O           0    0    workouts_workout_id_seq    SEQUENCE OWNED BY     S   ALTER SEQUENCE public.workouts_workout_id_seq OWNED BY public.workouts.workout_id;
          public               postgres    false    224            �           2604    17079    classbookings booking_id    DEFAULT     �   ALTER TABLE ONLY public.classbookings ALTER COLUMN booking_id SET DEFAULT nextval('public.classbookings_booking_id_seq'::regclass);
 G   ALTER TABLE public.classbookings ALTER COLUMN booking_id DROP DEFAULT;
       public               postgres    false    228    229    229            �           2604    17056    classes class_id    DEFAULT     t   ALTER TABLE ONLY public.classes ALTER COLUMN class_id SET DEFAULT nextval('public.classes_class_id_seq'::regclass);
 ?   ALTER TABLE public.classes ALTER COLUMN class_id DROP DEFAULT;
       public               postgres    false    226    227    227            �           2604    16961    users user_id    DEFAULT     n   ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);
 <   ALTER TABLE public.users ALTER COLUMN user_id DROP DEFAULT;
       public               postgres    false    217    218    218            �           2604    17047    workouts workout_id    DEFAULT     z   ALTER TABLE ONLY public.workouts ALTER COLUMN workout_id SET DEFAULT nextval('public.workouts_workout_id_seq'::regclass);
 B   ALTER TABLE public.workouts ALTER COLUMN workout_id DROP DEFAULT;
       public               postgres    false    225    224    225            >          0    17021    admins 
   TABLE DATA           8   COPY public.admins (user_id, authorisation) FROM stdin;
    public               postgres    false    222   I       E          0    17076    classbookings 
   TABLE DATA           S   COPY public.classbookings (booking_id, class_id, member_id, booked_at) FROM stdin;
    public               postgres    false    229   2I       C          0    17053    classes 
   TABLE DATA           �   COPY public.classes (class_id, capacity, scheduled_date, scheduled_time, duration_minutes, coach_id, workout_id, created_by, created_at) FROM stdin;
    public               postgres    false    227   OI       =          0    17009    coaches 
   TABLE DATA           /   COPY public.coaches (user_id, bio) FROM stdin;
    public               postgres    false    221   lI       ?          0    17033    managers 
   TABLE DATA           +   COPY public.managers (user_id) FROM stdin;
    public               postgres    false    223   �I       <          0    16997    members 
   TABLE DATA           C   COPY public.members (user_id, status, credits_balance) FROM stdin;
    public               postgres    false    220   �I       ;          0    16977 	   userroles 
   TABLE DATA           7   COPY public.userroles (user_id, user_role) FROM stdin;
    public               postgres    false    219   J       :          0    16958    users 
   TABLE DATA           \   COPY public.users (user_id, first_name, last_name, email, phone, password_hash) FROM stdin;
    public               postgres    false    218   *J       A          0    17044    workouts 
   TABLE DATA           M   COPY public.workouts (workout_id, workout_name, workout_content) FROM stdin;
    public               postgres    false    225   �J       P           0    0    classbookings_booking_id_seq    SEQUENCE SET     K   SELECT pg_catalog.setval('public.classbookings_booking_id_seq', 1, false);
          public               postgres    false    228            Q           0    0    classes_class_id_seq    SEQUENCE SET     C   SELECT pg_catalog.setval('public.classes_class_id_seq', 1, false);
          public               postgres    false    226            R           0    0    users_user_id_seq    SEQUENCE SET     ?   SELECT pg_catalog.setval('public.users_user_id_seq', 7, true);
          public               postgres    false    217            S           0    0    workouts_workout_id_seq    SEQUENCE SET     F   SELECT pg_catalog.setval('public.workouts_workout_id_seq', 1, false);
          public               postgres    false    224            �           2606    17027    admins admins_pkey 
   CONSTRAINT     U   ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (user_id);
 <   ALTER TABLE ONLY public.admins DROP CONSTRAINT admins_pkey;
       public                 postgres    false    222            �           2606    17084 2   classbookings classbookings_class_id_member_id_key 
   CONSTRAINT     |   ALTER TABLE ONLY public.classbookings
    ADD CONSTRAINT classbookings_class_id_member_id_key UNIQUE (class_id, member_id);
 \   ALTER TABLE ONLY public.classbookings DROP CONSTRAINT classbookings_class_id_member_id_key;
       public                 postgres    false    229    229            �           2606    17082     classbookings classbookings_pkey 
   CONSTRAINT     f   ALTER TABLE ONLY public.classbookings
    ADD CONSTRAINT classbookings_pkey PRIMARY KEY (booking_id);
 J   ALTER TABLE ONLY public.classbookings DROP CONSTRAINT classbookings_pkey;
       public                 postgres    false    229            �           2606    17059    classes classes_pkey 
   CONSTRAINT     X   ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (class_id);
 >   ALTER TABLE ONLY public.classes DROP CONSTRAINT classes_pkey;
       public                 postgres    false    227            �           2606    17015    coaches coaches_pkey 
   CONSTRAINT     W   ALTER TABLE ONLY public.coaches
    ADD CONSTRAINT coaches_pkey PRIMARY KEY (user_id);
 >   ALTER TABLE ONLY public.coaches DROP CONSTRAINT coaches_pkey;
       public                 postgres    false    221            �           2606    17037    managers managers_pkey 
   CONSTRAINT     Y   ALTER TABLE ONLY public.managers
    ADD CONSTRAINT managers_pkey PRIMARY KEY (user_id);
 @   ALTER TABLE ONLY public.managers DROP CONSTRAINT managers_pkey;
       public                 postgres    false    223            �           2606    17003    members members_pkey 
   CONSTRAINT     W   ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (user_id);
 >   ALTER TABLE ONLY public.members DROP CONSTRAINT members_pkey;
       public                 postgres    false    220            �           2606    16981    userroles userroles_pkey 
   CONSTRAINT     f   ALTER TABLE ONLY public.userroles
    ADD CONSTRAINT userroles_pkey PRIMARY KEY (user_id, user_role);
 B   ALTER TABLE ONLY public.userroles DROP CONSTRAINT userroles_pkey;
       public                 postgres    false    219    219            �           2606    16967    users users_email_key 
   CONSTRAINT     Q   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
 ?   ALTER TABLE ONLY public.users DROP CONSTRAINT users_email_key;
       public                 postgres    false    218            �           2606    16965    users users_pkey 
   CONSTRAINT     S   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);
 :   ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
       public                 postgres    false    218            �           2606    17051    workouts workouts_pkey 
   CONSTRAINT     \   ALTER TABLE ONLY public.workouts
    ADD CONSTRAINT workouts_pkey PRIMARY KEY (workout_id);
 @   ALTER TABLE ONLY public.workouts DROP CONSTRAINT workouts_pkey;
       public                 postgres    false    225            �           2606    17028    admins admins_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;
 D   ALTER TABLE ONLY public.admins DROP CONSTRAINT admins_user_id_fkey;
       public               postgres    false    4747    222    218            �           2606    17085 )   classbookings classbookings_class_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.classbookings
    ADD CONSTRAINT classbookings_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(class_id) ON DELETE CASCADE;
 S   ALTER TABLE ONLY public.classbookings DROP CONSTRAINT classbookings_class_id_fkey;
       public               postgres    false    229    4761    227            �           2606    17090 *   classbookings classbookings_member_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.classbookings
    ADD CONSTRAINT classbookings_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(user_id) ON DELETE CASCADE;
 T   ALTER TABLE ONLY public.classbookings DROP CONSTRAINT classbookings_member_id_fkey;
       public               postgres    false    220    4751    229            �           2606    17060    classes classes_coach_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.coaches(user_id);
 G   ALTER TABLE ONLY public.classes DROP CONSTRAINT classes_coach_id_fkey;
       public               postgres    false    4753    221    227            �           2606    17070    classes classes_created_by_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(user_id);
 I   ALTER TABLE ONLY public.classes DROP CONSTRAINT classes_created_by_fkey;
       public               postgres    false    227    4755    222            �           2606    17065    classes classes_workout_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES public.workouts(workout_id);
 I   ALTER TABLE ONLY public.classes DROP CONSTRAINT classes_workout_id_fkey;
       public               postgres    false    225    227    4759            �           2606    17016    coaches coaches_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.coaches
    ADD CONSTRAINT coaches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;
 F   ALTER TABLE ONLY public.coaches DROP CONSTRAINT coaches_user_id_fkey;
       public               postgres    false    218    221    4747            �           2606    17038    managers managers_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.managers
    ADD CONSTRAINT managers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;
 H   ALTER TABLE ONLY public.managers DROP CONSTRAINT managers_user_id_fkey;
       public               postgres    false    4747    218    223            �           2606    17004    members members_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;
 F   ALTER TABLE ONLY public.members DROP CONSTRAINT members_user_id_fkey;
       public               postgres    false    4747    220    218            �           2606    16982     userroles userroles_user_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.userroles
    ADD CONSTRAINT userroles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;
 J   ALTER TABLE ONLY public.userroles DROP CONSTRAINT userroles_user_id_fkey;
       public               postgres    false    4747    219    218            >      x������ � �      E      x������ � �      C      x������ � �      =   O   x��1
�0�ڼb_��bzK� �9�K8��;3vS���f��I'���l7���&ԍŜ��,*zİ���o�      ?      x������ � �      <      x������ � �      ;      x�3�L�OL������� #�      :   �   x�3��J�K���,���2��AL�Ԋ�܂�T���\NSSS]C#c΂��4���D#S3#3 Py԰���8s2�S9��3���8A<�,ϡ$�2l����.�@CCN�����;.s��323	����� c@       A      x������ � �     