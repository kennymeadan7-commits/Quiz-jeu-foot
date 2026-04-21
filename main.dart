import 'package:flutter/material.dart';

void main() => runApp(const QuizFootApp());

class QuizFootApp extends StatelessWidget {
  const QuizFootApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(useMaterial3: true),
      home: const QuizPage(),
    );
  }
}

class Question {
  final String text;
  final List<String> options;
  final int correctAnswerIndex;
  final String team; // 'Barca', 'Real' ou 'General'

  Question({
    required this.text,
    required this.options,
    required this.correctAnswerIndex,
    required this.team,
  });
}

class QuizPage extends StatefulWidget {
  const QuizPage({super.key});

  @override
  State<QuizPage> createState() => _QuizPageState();
}

class _QuizPageState extends State<QuizPage> {
  int _questionIndex = 0;
  int _score = 0;

  final List<Question> _questions = [
    Question(
      text: "Quel prodige de la Masia porte le numéro 19 en 2024 ?",
      options: ["Gavi", "Lamine Yamal", "Pedri", "Fermín López"],
      correctAnswerIndex: 1,
      team: 'Barca',
    ),
    Question(
      text: "Dans quel stade mythique joue le Real Madrid ?",
      options: ["Camp Nou", "Metropolitano", "Santiago Bernabéu", "Mestalla"],
      correctAnswerIndex: 2,
      team: 'Real',
    ),
    Question(
      text: "Combien de Ballons d'Or possède Lionel Messi ?",
      options: ["5", "7", "8", "3"],
      correctAnswerIndex: 2,
      team: 'Barca',
    ),
    Question(
      text: "Qui est l'actuel entraîneur du Real Madrid ?",
      options: ["Zidane", "Ancelotti", "Xavi", "Mourinho"],
      correctAnswerIndex: 1,
      team: 'Real',
    ),
  ];

  void _answerQuestion(int index) {
    if (index == _questions[_questionIndex].correctAnswerIndex) {
      setState(() => _score++);
    }
    setState(() => _questionIndex++);
  }

  // Fonction pour obtenir la couleur de l'AppBar selon l'équipe
  Color _getThemeColor() {
    if (_questionIndex >= _questions.length) return Colors.green;
    String team = _questions[_questionIndex].team;
    if (team == 'Barca') return const Color(0xFF004D98); // Bleu Barça
    if (team == 'Real') return const Color(0xFFFEBE10); // Doré Real
    return Colors.blueGrey;
  }

  @override
  Widget build(BuildContext context) {
    bool isFinished = _questionIndex >= _questions.length;
    Color themeColor = _getThemeColor();

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: const Text("Quiz El Clásico ⚽", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: themeColor,
        centerTitle: true,
        elevation: 10,
      ),
      body: isFinished ? _buildResultScreen() : _buildQuizScreen(themeColor),
    );
  }

  Widget _buildQuizScreen(Color themeColor) {
    var currentQuestion = _questions[_questionIndex];

    return Center(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 600), // Pour un rendu propre sur PC
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Indicateur de progression
            LinearProgressIndicator(
              value: (_questionIndex + 1) / _questions.length,
              backgroundColor: Colors.grey[300],
              color: themeColor,
            ),
            const SizedBox(height: 30),
            
            // Carte de la question
            Card(
              elevation: 4,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Text(
                  currentQuestion.text,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(height: 30),

            // Liste des réponses
            ...currentQuestion.options.asMap().entries.map((option) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: SizedBox(
                  width: double.infinity,
                  height: 55,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: themeColor,
                      side: BorderSide(color: themeColor, width: 2),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                    ),
                    onPressed: () => _answerQuestion(option.key),
                    child: Text(option.value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildResultScreen() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.emoji_events, size: 100, color: Colors.orange),
          const Text("Quiz Terminé !", style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          Text("Ton score est de : $_score / ${_questions.length}", style: const TextStyle(fontSize: 24)),
          const SizedBox(height: 30),
          ElevatedButton.icon(
            icon: const Icon(Icons.refresh),
            label: const Text("Rejouer le match"),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15),
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
            ),
            onPressed: () => setState(() { _questionIndex = 0; _score = 0; }),
          ),
        ],
      ),
    );
  }
}