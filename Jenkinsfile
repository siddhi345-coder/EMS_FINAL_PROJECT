pipeline {
    agent any

    environment {
        // Docker Hub credentials stored in Jenkins
        DOCKERHUB_CREDS = credentials('dockerhub-creds')

        // Docker image names
        BACKEND_IMAGE = "sid458dhi/ems-backend"
        FRONTEND_IMAGE = "sid458dhi/ems-frontend"

        // EC2 host for deployment
        EC2_HOST = "13.62.212.126"
    }

    stages {

        stage('Checkout Code') {
            steps {
                // Explicitly checkout the main branch
                git branch: 'main', url: 'https://github.com/siddhi345-coder/EMS_FINAL_PROJECT.git'
            }
        }

        stage('Build Backend Image') {
            steps {
                // Use the correct folder name (case-sensitive)
                sh 'docker build -t $BACKEND_IMAGE:latest ./Backend'
            }
        }

        stage('Build Frontend Image') {
            steps {
                // Use the correct folder name (case-sensitive)
                sh 'docker build -t $FRONTEND_IMAGE:latest ./Frontend'
            }
        }

        stage('DockerHub Login') {
            steps {
                // Login using Jenkins credentials
                sh '''
                echo $DOCKERHUB_CREDS_PSW | docker login -u $DOCKERHUB_CREDS_USR --password-stdin
                '''
            }
        }

        stage('Push Images') {
            steps {
                sh '''
                docker push $BACKEND_IMAGE:latest
                docker push $FRONTEND_IMAGE:latest
                '''
            }
        }

        stage('Deploy to EC2') {
            steps {
                // Use SSH key stored in Jenkins
                sshagent(['ec2-ssh-key']) {
                    sh '''
                    ssh -o StrictHostKeyChecking=no ubuntu@$EC2_HOST "
                        cd ~/ems-deployment &&
                        docker-compose pull &&
                        docker-compose up -d
                    "
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "✅ CI/CD pipeline completed successfully!"
        }
        failure {
            echo "❌ CI/CD pipeline failed. Check the logs above."
        }
    }
}
