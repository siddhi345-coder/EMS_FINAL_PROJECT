pipeline {
    agent any

    environment {
        // Docker Hub credentials stored in Jenkins
        DOCKERHUB_CREDS = credentials('dockerhub-creds')

        // Enable faster, smarter Docker builds
        DOCKER_BUILDKIT = '1'

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

        stage('Load Common Env') {
            steps {
                // Load a Jenkins "Secret file" into both services
                withCredentials([file(credentialsId: 'ems-common-env', variable: 'COMMON_ENV_FILE')]) {
                    sh '''
                    cp "$COMMON_ENV_FILE" Backend/.env
                    cp "$COMMON_ENV_FILE" reports_service/.env
                    '''
                }
            }
        }

        stage('Build Images') {
            parallel {
                stage('Build Backend Image') {
                    steps {
                        // Pull latest image to seed cache (ignore if missing)
                        sh 'docker pull $BACKEND_IMAGE:latest || true'
                        // Use the correct folder name (case-sensitive)
                        sh 'docker build --cache-from $BACKEND_IMAGE:latest -t $BACKEND_IMAGE:latest ./Backend'
                    }
                }

                stage('Build Frontend Image') {
                    steps {
                        // Pull latest image to seed cache (ignore if missing)
                        sh 'docker pull $FRONTEND_IMAGE:latest || true'
                        // Use the correct folder name (case-sensitive)
                        sh 'docker build --cache-from $FRONTEND_IMAGE:latest -t $FRONTEND_IMAGE:latest ./Frontend'
                    }
                }
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
                // Use SSH key stored in Jenkins without sshagent plugin
                withCredentials([sshUserPrivateKey(credentialsId: 'ec2-ssh-key', keyFileVariable: 'EC2_SSH_KEY', usernameVariable: 'EC2_SSH_USER')]) {
                    sh '''
                    chmod 600 "$EC2_SSH_KEY"
                    ssh -i "$EC2_SSH_KEY" -o StrictHostKeyChecking=no "$EC2_SSH_USER@$EC2_HOST" "
                        cd ~/EMS_FINAL_PROJECT &&
                        docker compose pull &&
                        docker compose up -d
                    "
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "CI/CD pipeline completed successfully!"
        }
        failure {
            echo "CI/CD pipeline failed. Check the logs above."
        }
    }
}

