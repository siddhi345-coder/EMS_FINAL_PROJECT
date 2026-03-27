pipeline {
    agent any

    environment {
        DOCKER_USERNAME = "sid458dhi"
        BACKEND_IMAGE = "${DOCKER_USERNAME}/ems-backend"
        FRONTEND_IMAGE = "${DOCKER_USERNAME}/ems-frontend"
        REPORTS_IMAGE = "${DOCKER_USERNAME}/ems-reports"
    }

    stages {

        stage('Checkout Code') {
            steps {
                git 'https://https://github.com/siddhi345-coder/EMS_FINAL_PROJECT.git'
            }
        }

        stage('Docker Login') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh 'docker build -t $BACKEND_IMAGE ./ems-backend'
                sh 'docker build -t $FRONTEND_IMAGE ./ems-frontend'
                sh 'docker build -t $REPORTS_IMAGE ./reports_service'
            }
        }

        stage('Push Images') {
            steps {
                sh 'docker push $BACKEND_IMAGE'
                sh 'docker push $FRONTEND_IMAGE'
                sh 'docker push $REPORTS_IMAGE'
            }
        }
    }
}